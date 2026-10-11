const listeners = new Set();

export function notifyTrackingChanged({ userId, childId }) {
  if (!userId || !childId) {
    return;
  }

  for (const listener of [...listeners]) {
    try {
      listener({ userId, childId });
    } catch (error) {
      console.error("Unable to notify tracking change:", error);
    }
  }
}

export function subscribeToTrackingChanges(listener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
