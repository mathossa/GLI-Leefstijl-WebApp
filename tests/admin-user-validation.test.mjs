import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDisplayName } from "../src/lib/admin-user-validation.mjs";

test("valid ordinary and international user names are accepted", () => {
  for (const name of ["Mathijs", "Marieke", "Jan de Vries", "Anna-Marie", "José", "Zoë", "李明", "O'Connor", "Mary-Jane"]) {
    assert.equal(normalizeDisplayName(name), name);
  }
});
test("display names are normalized and enforce the actual field limit", () => {
  assert.equal(normalizeDisplayName("  Mathijs  "), "Mathijs");
  assert.equal(normalizeDisplayName("A".repeat(120)), "A".repeat(120));
  assert.equal(normalizeDisplayName("A".repeat(121)), null);
  assert.equal(normalizeDisplayName(" "), null);
  assert.equal(normalizeDisplayName(null), null);
  assert.equal(normalizeDisplayName("Naam\nextra"), null);
  assert.equal(normalizeDisplayName("Naam\tmet tab"), null);
  assert.equal(normalizeDisplayName("Naam\u007f"), null);
});
