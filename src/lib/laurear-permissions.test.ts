import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { canGrantAward } from "./laurear-permissions";

describe("authorized award grants", () => {
  test("administrators may grant awards", () => strictEqual(canGrantAward(true, false, false), true));
  test("authorized members need both view and create", () => {
    strictEqual(canGrantAward(false, true, true), true);
    strictEqual(canGrantAward(false, true, false), false);
    strictEqual(canGrantAward(false, false, true), false);
    strictEqual(canGrantAward(false, false, false), false);
  });
});