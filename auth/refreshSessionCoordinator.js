function sessionChangedError() {
  const error = new Error("The authentication session changed.");
  error.code = "AUTH_SESSION_CHANGED";
  return error;
}

function createRefreshSessionCoordinator({
  getRefreshToken,
  refreshAuthSession,
  saveRefreshToken,
}) {
  let generation = 0;
  let refreshInFlight = null;

  function beginSessionTransition() {
    generation += 1;
    refreshInFlight = null;
  }

  function getSessionGeneration() {
    return generation;
  }

  function assertCurrentGeneration(expectedGeneration) {
    if (expectedGeneration !== generation) {
      throw sessionChangedError();
    }
  }

  function refreshStoredSession() {
    const refreshGeneration = generation;

    if (refreshInFlight?.generation === refreshGeneration) {
      return refreshInFlight.promise;
    }

    const operation = (async () => {
      const storedRefreshToken = await getRefreshToken();

      assertCurrentGeneration(refreshGeneration);

      if (!storedRefreshToken) {
        return null;
      }

      const result = await refreshAuthSession(storedRefreshToken);

      assertCurrentGeneration(refreshGeneration);

      await saveRefreshToken(result.refreshToken);

      assertCurrentGeneration(refreshGeneration);

      return result;
    })();

    const currentRefresh = {
      generation: refreshGeneration,
      promise: operation.finally(() => {
        if (refreshInFlight === currentRefresh) {
          refreshInFlight = null;
        }
      }),
    };

    refreshInFlight = currentRefresh;

    return currentRefresh.promise;
  }

  return {
    assertCurrentGeneration,
    beginSessionTransition,
    getSessionGeneration,
    refreshStoredSession,
  };
}

module.exports = {
  createRefreshSessionCoordinator,
};
