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

/** Assinatura eletrônica determinística exibida na credencial. */
export function assinaturaEletronica(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h.toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
}
