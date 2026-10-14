const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createRefreshSessionCoordinator,
} = require("../auth/refreshSessionCoordinator");

function deferred() {
  let resolve;
  let reject;

  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

test("concurrent refreshes share one rotating backend request", async () => {
  let requestCount = 0;
  const savedTokens = [];
  const backend = deferred();

  const coordinator = createRefreshSessionCoordinator({
    getRefreshToken: async () => "refresh-token-1",
    refreshAuthSession: async () => {
      requestCount += 1;
      return backend.promise;
    },
    saveRefreshToken: async (token) => {
      savedTokens.push(token);
    },
  });

  const first = coordinator.refreshStoredSession();
  const second = coordinator.refreshStoredSession();

  backend.resolve({
    accessToken: "access-token-2",
    refreshToken: "refresh-token-2",
  });

  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(requestCount, 1);
  assert.deepEqual(savedTokens, ["refresh-token-2"]);
  assert.equal(firstResult, secondResult);
});

test("a late refresh response cannot persist after a session transition", async () => {
  const savedTokens = [];
  const backend = deferred();

  const coordinator = createRefreshSessionCoordinator({
    getRefreshToken: async () => "refresh-token-1",
    refreshAuthSession: async () => backend.promise,
    saveRefreshToken: async (token) => {
      savedTokens.push(token);
    },
  });

  const refresh = coordinator.refreshStoredSession();

  await Promise.resolve();
  coordinator.beginSessionTransition();

  backend.resolve({
    accessToken: "access-token-2",
    refreshToken: "refresh-token-2",
  });

  await assert.rejects(refresh, { code: "AUTH_SESSION_CHANGED" });
  assert.deepEqual(savedTokens, []);
});
