export const DRAWER_ACTIONS = Object.freeze({
  OPEN: "OPEN",
  TOGGLE: "TOGGLE",
  CLOSE: "CLOSE"
});

export function getNextDrawerState(currentState, action) {
  if (action === DRAWER_ACTIONS.OPEN) return true;
  if (action === DRAWER_ACTIONS.TOGGLE) return !currentState;
  return false;
}
