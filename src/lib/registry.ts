export type RegistryEntry = {
  full_name: string;
  cpf: string;
  lion_number: string;
  birth_date: string | null;
};

export const onlyDigits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export function formatCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

/** Converte valores de planilha (texto ou serial do Excel) em YYYY-MM-DD. */
export function toISODate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  const br = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (br) return `${br[3]}-${br[2]!.padStart(2, "0")}-${br[1]!.padStart(2, "0")}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0]!;
  return null;
}

const NAME_KEYS = ["nome", "nome completo", "full_name", "name", "associado"];
const CPF_KEYS = ["cpf", "documento", "cpf/cnpj"];
const LION_KEYS = ["numero lion", "número lion", "n lion", "nº lion", "lion", "lion_number", "matricula", "matrícula", "member id", "id lion"];
const BIRTH_KEYS = ["data de nascimento", "data nascimento", "nascimento", "birth_date", "data_nascimento", "dt nascimento"];

function pick(row: Record<string, unknown>, keys: string[]) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  for (const [k, v] of Object.entries(row)) {
    if (keys.includes(norm(k))) return v;
  }
  return undefined;
}

export function parseRegistryRows(rows: Record<string, unknown>[]) {
  const valid: RegistryEntry[] = [];
  const invalid: { line: number; reason: string }[] = [];

  rows.forEach((row, i) => {
    const full_name = String(pick(row, NAME_KEYS) ?? "").trim();
    const cpf = onlyDigits(pick(row, CPF_KEYS));
    const lion_number = onlyDigits(pick(row, LION_KEYS));
    const birth_date = toISODate(pick(row, BIRTH_KEYS));

    if (!full_name) return invalid.push({ line: i + 2, reason: "Nome ausente" });
    if (cpf.length !== 11) return invalid.push({ line: i + 2, reason: "CPF inválido" });
    if (!lion_number) return invalid.push({ line: i + 2, reason: "Número Lion ausente" });

    valid.push({ full_name, cpf, lion_number, birth_date });
  });

  // remove CPFs duplicados dentro do próprio arquivo (mantém o último)
  const byCpf = new Map<string, RegistryEntry>();
  valid.forEach((v) => byCpf.set(v.cpf, v));

  return { valid: [...byCpf.values()], invalid };
}

export type MatchResult = {
  matched: boolean;
  cpfFound: boolean;
  lionOk: boolean;
  birthOk: boolean;
  nameOk: boolean;
};

export function matchProfile(
  profile: { full_name: string; cpf?: string | null; lion_number?: string | null; birth_date?: string | null },
  registry: Map<string, RegistryEntry>,
): MatchResult {
  const entry = registry.get(onlyDigits(profile.cpf));
  if (!entry) return { matched: false, cpfFound: false, lionOk: false, birthOk: false, nameOk: false };

  const lionOk = entry.lion_number === onlyDigits(profile.lion_number);
  const birthOk = !entry.birth_date || !profile.birth_date || entry.birth_date === profile.birth_date;
  const nameOk = entry.full_name.trim().toLowerCase() === (profile.full_name ?? "").trim().toLowerCase();

  return { matched: lionOk && birthOk, cpfFound: true, lionOk, birthOk, nameOk };
}
