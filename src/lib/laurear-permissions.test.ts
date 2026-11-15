import { describe, expect, test } from "bun:test";
import { canGrantAward } from "./laurear-permissions";

describe("authorized award grants", () => {
  test("administrators may grant awards", () => expect(canGrantAward(true, false, false)).toBe(true));
  test("authorized members need both view and create", () => {
    expect(canGrantAward(false, true, true)).toBe(true);
    expect(canGrantAward(false, true, false)).toBe(false);
    expect(canGrantAward(false, false, true)).toBe(false);
    expect(canGrantAward(false, false, false)).toBe(false);
  });
});