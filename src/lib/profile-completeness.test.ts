import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import {
  PROFILE_COMPLETENESS_THRESHOLD,
  completeness,
  needsOnboarding,
  type CompletenessProfile,
} from "./profile-completeness";

const ALL_FIELDS = [
  "full_name", "cpf", "lion_number", "birth_date", "phone", "club_name", "city",
  "cep", "logradouro", "numero", "bairro", "estado", "avatar_url", "bio", "role_in_club",
] as const;

function profileWith(filled: string[]): CompletenessProfile {
  const p: Record<string, string | null> = {};
  for (const key of ALL_FIELDS) p[key] = filled.includes(key) ? `valor-${key}` : null;
  return p as CompletenessProfile;
}

describe("pedido de atualização de perfil no login", () => {
  test("o percentual mínimo é 75", () => strictEqual(PROFILE_COMPLETENESS_THRESHOLD, 75));

  test("12 dos 15 campos dão 80% de completude", () => {
    const filled = ALL_FIELDS.filter((k) => k !== "birth_date" && k !== "cep" && k !== "bio");
    strictEqual(completeness(profileWith(filled)).percent, 80);
  });

  test("com 80% preenchidos não pede mais o cadastro, mesmo faltando campo obrigatório", () => {
    const filled = ALL_FIELDS.filter((k) => k !== "birth_date" && k !== "cep" && k !== "bio");
    const p = profileWith(filled);
    strictEqual(completeness(p).requiredMissing.length, 1);
    strictEqual(needsOnboarding(p), false);
  });

  test("abaixo de 75% ainda pede o cadastro", () => {
    const filled = ALL_FIELDS.filter(
      (k) => k !== "birth_date" && k !== "cep" && k !== "bio" && k !== "bairro",
    );
    const p = profileWith(filled);
    strictEqual(completeness(p).percent, 73);
    strictEqual(needsOnboarding(p), true);
  });

  test("quem já concluiu o onboarding nunca é interrompido", () =>
    strictEqual(needsOnboarding({ ...profileWith(["full_name"]), onboarding_done: true }), false));

  test("sem perfil ainda pede o cadastro", () => strictEqual(needsOnboarding(null), true));
});
