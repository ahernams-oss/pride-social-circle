import { supabase } from "@/integrations/supabase/client";
import { fetchDistrito, type Governador } from "@/lib/distrito-api";
import { tituloSiglas } from "@/lib/vf-credencial";

/** Retorna true quando hoje (data local) é o aniversário da pessoa. */
export function isBirthdayToday(birthDate?: string | null): boolean {
  if (!birthDate) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate.trim());
  if (!m) return false;
  const now = new Date();
  return Number(m[2]) === now.getMonth() + 1 && Number(m[3]) === now.getDate();
}

/** Ano Leonístico corrente: vai de 1º de julho a 30 de junho. */
export function anoLeonistico(ref: Date = new Date()): string {
  const y = ref.getFullYear();
  const start = ref.getMonth() >= 6 ? y : y - 1; // julho (mês 6) inicia o novo ano
  return `${start}/${start + 1}`;
}

export type GovernorSignature = {
  /** Siglas do título + nome, ex.: "CL MJF André Luís Périssé". */
  signedName: string;
  name: string;
};

const isGovernorRole = (r: string) => /governador/i.test(r) && !/vice|eleito|past/i.test(r);

/**
 * Busca o governador do momento: primeiro o cargo configurado em
 * Admin → Cargos do Distrito; se vazio, usa a API pública do Distrito LC-11.
 * Ao trocar o governador no cadastro, a assinatura muda automaticamente.
 */
export async function fetchCurrentGovernor(): Promise<GovernorSignature | null> {
  try {
    const { data: roles } = await supabase.from("district_roles").select("name,assigned_user_id");
    const row = (roles ?? []).find((r) => isGovernorRole(r.name) && r.assigned_user_id);
    if (row?.assigned_user_id) {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name,lions_title")
        .eq("id", row.assigned_user_id)
        .maybeSingle();
      if (p?.full_name) {
        const siglas = tituloSiglas(p.lions_title);
        return {
          name: p.full_name,
          signedName: siglas ? `${siglas} ${p.full_name}` : p.full_name,
        };
      }
    }
  } catch {
    // segue para o fallback da API do distrito
  }

  try {
    const governadores = await fetchDistrito<Governador[]>("/api/public/governadores");
    const gov = (governadores ?? []).find((g) => isGovernorRole(g.role));
    if (gov?.name) {
      const name = gov.name.trim();
      return { name, signedName: name };
    }
  } catch {
    // sem governador disponível
  }
  return null;
}

/** Monta a mensagem de aniversário com o nome do aniversariante. */
export function birthdayMessage(nome: string): string {
  return `🎉🎂 FELIZ ANIVERSÁRIO! 🦁

Prezado(a) Companheiro(a) Leão ${nome},

Hoje é um dia especial, e quero, em nome do Distrito LC-11, expressar meus mais sinceros votos de felicidade pela passagem do seu aniversário!

Que este novo ciclo de vida seja repleto de saúde, paz, realizações e momentos felizes ao lado de seus familiares e amigos.

Que o espírito de companheirismo, solidariedade e serviço que nos une continue iluminando sua caminhada e inspirando novas conquistas.

Receba meu fraterno abraço e os votos de um aniversário muito feliz!

Parabéns pelo seu dia! 🎉🦁

Com estima e companheirismo,`;
}
