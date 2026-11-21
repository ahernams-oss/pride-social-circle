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

export const ANO_LEONISTICO_KEY = "ano_leonistico";

/**
 * Ano Leonístico configurado em Admin → Cargos do Distrito.
 * Sem configuração, usa o ano calculado automaticamente (julho a junho).
 */
export async function fetchAnoLeonistico(): Promise<string> {
  try {
    const { data } = await supabase
      .from("district_settings")
      .select("value")
      .eq("key", ANO_LEONISTICO_KEY)
      .maybeSingle();
    const v = data?.value?.trim();
    if (v) return v;
  } catch {
    // usa o cálculo automático
  }
  return anoLeonistico();
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

/** Dados da assinatura do governador: nome assinado + ano leonístico configurado. */
export type GovernorSignatureData = {
  governor: GovernorSignature | null;
  anoLeonistico: string;
};

export async function fetchGovernorSignatureData(): Promise<GovernorSignatureData> {
  const [governor, ano] = await Promise.all([fetchCurrentGovernor(), fetchAnoLeonistico()]);
  return { governor, anoLeonistico: ano };
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

/** Percentual a partir do qual o governador parabeniza pelo perfil completo. */
export const PROFILE_CONGRATS_THRESHOLD = 80;

export function shouldCongratulateProfile(percent: number): boolean {
  return percent > PROFILE_CONGRATS_THRESHOLD;
}

/** Mensagem de parabéns pelo preenchimento do perfil. */
export function profileCongratsMessage(nome: string): string {
  return `👏🦁 PARABÉNS PELO SEU PERFIL!

Prezado(a) Companheiro(a) Leão ${nome},

É com grande satisfação que, em nome do Distrito LC-11, parabenizo você por ter completado mais de 80% do seu perfil no Lions Connecta!

Sua dedicação em manter seus dados atualizados demonstra o comprometimento e o espírito leonístico que fortalecem a nossa família e tornam o nosso trabalho de servir ainda mais eficiente.

Muito obrigado pelo seu empenho e por fazer parte desta grande corrente de servir!

Com estima e companheirismo,`;
}
