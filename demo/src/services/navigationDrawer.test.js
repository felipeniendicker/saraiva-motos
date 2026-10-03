import test from "node:test";
import assert from "node:assert/strict";
import { DRAWER_ACTIONS, getNextDrawerState } from "./navigationDrawer.js";

test("drawer abre e alterna por uma transição previsível", () => {
  assert.equal(getNextDrawerState(false, DRAWER_ACTIONS.OPEN), true);
  assert.equal(getNextDrawerState(false, DRAWER_ACTIONS.TOGGLE), true);
  assert.equal(getNextDrawerState(true, DRAWER_ACTIONS.TOGGLE), false);
});

test("Escape, navegação, backdrop e logout usam a mesma transição de fechamento", () => {
  for (const source of ["ESCAPE", "NAVIGATION", "BACKDROP", "LOGOUT"]) {
    assert.equal(getNextDrawerState(true, DRAWER_ACTIONS.CLOSE), false, source);
  }
});
