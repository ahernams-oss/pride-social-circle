/** Regras da credencial de delegado (código da urna + assinatura eletrônica). */

/** Dia (2 dígitos) da data de nascimento cadastrada no perfil. */
export function diaNascimento(birthDate?: string | null): string | null {
  if (!birthDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDate);
  if (!m) return null;
  return m[3]!;
}

/** Código completo da urna: código de acesso (4 dígitos) + dia do nascimento. Ex.: 2522 + 15 = 252215 */
export function codigoUrna(codigoAcesso: string, birthDate?: string | null): string {
  const dia = diaNascimento(birthDate);
  return dia ? `${codigoAcesso}${dia}` : codigoAcesso;
}

/** Código exibido na credencial: apenas os 4 primeiros dígitos; os 2 últimos (dia do nascimento) viram XX. Ex.: 2522XX */
export function codigoUrnaCredencial(codigoAcesso: string, birthDate?: string | null): string {
  return diaNascimento(birthDate) ? `${codigoAcesso}XX` : codigoUrna(codigoAcesso, birthDate);
}

/** Assinatura eletrônica determinística exibida na credencial. */
export function assinaturaEletronica(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h.toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
}

import { supabase } from "@/integrations/supabase/client";

export type DelegadoAuth = {
  id: string; nome: string; eleicao_id: string; habilitado_votar: boolean; ja_votou: boolean;
};

/** Valida o código digitado na urna: 4 dígitos do delegado + dia do nascimento do perfil. */
export async function autenticarDelegado(input: string): Promise<{ delegado?: DelegadoAuth; erro?: string }> {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 4) return { erro: "Código inválido" };
  const base = digits.slice(0, 4);
  const { data: d } = await supabase
    .from("vf_delegados")
    .select("id,nome,eleicao_id,habilitado_votar,ja_votou,associado_id")
    .eq("codigo_acesso", base)
    .maybeSingle();
  if (!d) return { erro: "Código inválido" };
  let birth: string | null = null;
  if ((d as any).associado_id) {
    const { data: p } = await supabase.from("profiles").select("birth_date").eq("id", (d as any).associado_id).maybeSingle();
    birth = (p?.birth_date as string | null) ?? null;
  }
  if (digits !== codigoUrna(base, birth)) return { erro: "Código inválido" };
  return { delegado: d as unknown as DelegadoAuth };
}
