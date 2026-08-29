import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "nelo_refresh_token";

export async function saveRefreshToken(refreshToken) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function removeRefreshToken() {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
