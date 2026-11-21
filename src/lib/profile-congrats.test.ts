import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { shouldCongratulateProfile } from "./birthday-message";
describe("parabéns do governador pelo perfil", () => {
  test("só aparece acima de 80%", () => {
    strictEqual(shouldCongratulateProfile(80), false);
    strictEqual(shouldCongratulateProfile(81), true);
  });
});
