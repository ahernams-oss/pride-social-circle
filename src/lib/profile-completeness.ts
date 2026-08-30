export type CompletenessProfile = {
  full_name?: string | null;
  avatar_url?: string | null;
  club_name?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
  lion_number?: string | null;
  birth_date?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  estado?: string | null;
  bio?: string | null;
  role_in_club?: string | null;
};

type Field = { key: keyof CompletenessProfile; label: string; required: boolean };

/** Campos exigidos no primeiro acesso (onboarding) e usados na barra de completude. */
export const PROFILE_FIELDS: Field[] = [
  { key: "full_name", label: "Nome completo", required: true },
  { key: "cpf", label: "CPF", required: true },
  { key: "lion_number", label: "Número Lion", required: true },
  { key: "birth_date", label: "Data de nascimento", required: true },
  { key: "phone", label: "Telefone celular", required: true },
  { key: "club_name", label: "Clube", required: true },
  { key: "city", label: "Cidade", required: true },
  { key: "cep", label: "CEP", required: false },
  { key: "logradouro", label: "Logradouro", required: false },
  { key: "numero", label: "Número", required: false },
  { key: "bairro", label: "Bairro", required: false },
  { key: "estado", label: "Estado", required: false },
  { key: "avatar_url", label: "Foto de perfil", required: false },
  { key: "bio", label: "Bio", required: false },
  { key: "role_in_club", label: "Cargo no clube", required: false },
];

const filled = (v: unknown) => typeof v === "string" && v.trim().length > 0;

export function missingFields(p: CompletenessProfile | null | undefined, onlyRequired = false) {
  if (!p) return PROFILE_FIELDS.filter((f) => (onlyRequired ? f.required : true));
  return PROFILE_FIELDS.filter((f) => (onlyRequired ? f.required : true)).filter(
    (f) => !filled(p[f.key]),
  );
}

export function completeness(p: CompletenessProfile | null | undefined) {
  const total = PROFILE_FIELDS.length;
  const missing = missingFields(p);
  const done = total - missing.length;
  return {
    percent: Math.round((done / total) * 100),
    done,
    total,
    missing,
    requiredMissing: missingFields(p, true),
  };
}

/** O onboarding é obrigatório enquanto faltar algum campo essencial. */
export function needsOnboarding(
  p: (CompletenessProfile & { onboarding_done?: boolean | null }) | null | undefined,
) {
  if (!p) return true;
  if (p.onboarding_done) return false;
  return missingFields(p, true).length > 0;
}
