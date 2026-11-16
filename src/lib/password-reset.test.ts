import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
const expect = (v: unknown) => ({ toBe: (e: unknown) => strictEqual(v, e) });
import { resetAnswersMatch, MAX_RESET_ATTEMPTS } from "./password-reset";

const p = { birth_date: "1975-03-22", club_name: "Lions Niterói Fonseca" };
describe("redefinição após senha zerada", () => {
  test("aceita data completa e clube corretos (sem acento/maiúsculas)", () => {
    expect(resetAnswersMatch(p, { birth_date: "1975-03-22", club_name: "lions niteroi fonseca" })).toBe(true);
  });
  test("recusa data de nascimento diferente", () => {
    expect(resetAnswersMatch(p, { birth_date: "1975-03-23", club_name: p.club_name })).toBe(false);
  });
  test("recusa clube diferente", () => {
    expect(resetAnswersMatch(p, { birth_date: p.birth_date, club_name: "LC Nitroi" })).toBe(false);
  });
  test("recusa quando o perfil não tem data de nascimento", () => {
    expect(resetAnswersMatch({ birth_date: null, club_name: p.club_name }, { birth_date: "1975-03-22", club_name: p.club_name })).toBe(false);
  });
  test("limite de 5 tentativas", () => expect(MAX_RESET_ATTEMPTS).toBe(5));
});
