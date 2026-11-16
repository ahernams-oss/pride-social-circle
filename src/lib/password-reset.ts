export const MAX_RESET_ATTEMPTS = 5;

export function normalizeText(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Confere data de nascimento (YYYY-MM-DD) e clube informados com o perfil. */
export function resetAnswersMatch(
  profile: { birth_date: string | null; club_name: string | null },
  answers: { birth_date: string; club_name: string },
): boolean {
  if (!profile.birth_date || !answers.birth_date) return false;
  if (profile.birth_date.slice(0, 10) !== answers.birth_date.slice(0, 10)) return false;
  const club = normalizeText(profile.club_name);
  return club.length > 0 && club === normalizeText(answers.club_name);
}
