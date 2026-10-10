const blockers = new Set();
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener(isAppUpdateSafe()));
}

export function setAppUpdateBlocked(id, blocked) {
  if (blocked) blockers.add(id);
  else blockers.delete(id);
  notify();
}

export function isAppUpdateSafe() {
  return blockers.size === 0;
}

export function subscribeToAppUpdateSafety(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
