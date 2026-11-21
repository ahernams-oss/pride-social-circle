import { describe, it, expect } from "vitest";
import { shouldCongratulateProfile } from "./birthday-message";
describe("parabéns do governador pelo perfil", () => {
  it("só aparece acima de 80%", () => {
    expect(shouldCongratulateProfile(80)).toBe(false);
    expect(shouldCongratulateProfile(81)).toBe(true);
  });
});
