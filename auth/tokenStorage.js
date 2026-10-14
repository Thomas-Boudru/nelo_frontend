import * as SecureStore from "expo-secure-store";

// On conserve la clé existante pour récupérer les sessions déjà présentes.
const REFRESH_TOKEN_KEY = "nelo_refresh_token";

let mutationQueue = Promise.resolve();

function enqueueMutation(mutation) {
  const result = mutationQueue.then(mutation, mutation);

  mutationQueue = result.catch(() => {});

  return result;
}

function isValidUser(user) {
  return Boolean(
    user &&
    typeof user === "object" &&
    typeof user.id === "string" &&
    user.id.trim(),
  );
}

function decodeSession(value) {
  if (!value) {
    return null;
  }

  // Compatibilité avec l'ancien format :
  // la valeur contenait uniquement le refresh token.
  if (!value.trimStart().startsWith("{")) {
    return {
      version: 1,
      refreshToken: value,
      user: null,
    };
  }

  try {
    const parsed = JSON.parse(value);

    if (
      parsed?.version !== 1 ||
      typeof parsed.refreshToken !== "string" ||
      !parsed.refreshToken.trim()
    ) {
      return null;
    }

    return {
      version: 1,
      refreshToken: parsed.refreshToken,
      user: isValidUser(parsed.user) ? parsed.user : null,
    };
  } catch {
    return null;
  }
}

function requireRefreshToken(refreshToken) {
  if (typeof refreshToken !== "string" || !refreshToken.trim()) {
    throw new Error("A valid refresh token is required.");
  }
}

async function readStoredSession() {
  const value = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

  return decodeSession(value);
}

async function writeStoredSession({ refreshToken, user }) {
  await SecureStore.setItemAsync(
    REFRESH_TOKEN_KEY,
    JSON.stringify({
      version: 1,
      refreshToken,
      user: user ?? null,
    }),
  );
}

// À appeler après une connexion réussie.
// Le token et le profil sont enregistrés dans une seule valeur.
export async function saveAuthenticatedSession({ refreshToken, user }) {
  requireRefreshToken(refreshToken);

  if (!isValidUser(user)) {
    throw new Error("A valid user is required.");
  }

  return enqueueMutation(() =>
    writeStoredSession({
      refreshToken,
      user,
    }),
  );
}

// Utilisée par le coordinateur lors d'une rotation du refresh token.
// Le profil du compte déjà enregistré est conservé.
export async function saveRefreshToken(refreshToken) {
  requireRefreshToken(refreshToken);

  return enqueueMutation(async () => {
    const currentSession = await readStoredSession();

    await writeStoredSession({
      refreshToken,
      user: currentSession?.user ?? null,
    });
  });
}

export async function getRefreshToken() {
  await mutationQueue;

  const session = await readStoredSession();

  return session?.refreshToken ?? null;
}

export async function getStoredSession() {
  await mutationQueue;

  return readStoredSession();
}

// Actualise le profil uniquement si le token attendu est encore courant.
// Une réponse ancienne ne doit pas modifier une nouvelle session.
export async function saveStoredUser({ user, expectedRefreshToken }) {
  if (!isValidUser(user)) {
    throw new Error("A valid user is required.");
  }

  requireRefreshToken(expectedRefreshToken);

  return enqueueMutation(async () => {
    const currentSession = await readStoredSession();

    if (
      !currentSession ||
      currentSession.refreshToken !== expectedRefreshToken
    ) {
      return false;
    }

    if (currentSession.user && currentSession.user.id !== user.id) {
      return false;
    }

    await writeStoredSession({
      refreshToken: currentSession.refreshToken,
      user,
    });

    return true;
  });
}

// Efface à la fois le refresh token et le profil local.
export async function removeRefreshToken() {
  return enqueueMutation(() => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY));
}
