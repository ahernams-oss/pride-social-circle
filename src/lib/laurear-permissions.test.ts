import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { canGrantAward, canEditAward } from "./laurear-permissions";

describe("authorized award grants", () => {
  test("administrators may grant awards", () => strictEqual(canGrantAward(true, false, false), true));
  test("authorized members need both view and create", () => {
    strictEqual(canGrantAward(false, true, true), true);
    strictEqual(canGrantAward(false, true, false), false);
    strictEqual(canGrantAward(false, false, true), false);
    strictEqual(canGrantAward(false, false, false), false);
  });
});

describe("authorized award edits", () => {
  test("administrators may correct existing awards", () => strictEqual(canEditAward(true, false, false), true));
  test("members require explicit view and edit permissions", () => {
    strictEqual(canEditAward(false, true, true), true);
    strictEqual(canEditAward(false, true, false), false);
    strictEqual(canEditAward(false, false, true), false);
    strictEqual(canEditAward(false, false, false), false);
  });
});