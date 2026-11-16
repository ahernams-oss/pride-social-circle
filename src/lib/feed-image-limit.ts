// Limite de tamanho das imagens anexadas a uma publicação do feed.
// Regra do Distrito: no máximo 300 KB por imagem.

export const MAX_IMAGE_BYTES = 300 * 1024;
export const MAX_IMAGE_LABEL = "300 KB";

export function isWithinImageLimit(bytes: number) {
  return bytes <= MAX_IMAGE_BYTES;
}

export function formatImageSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export function imageLimitMessage(bytes: number) {
  return `A imagem deve ter no máximo ${MAX_IMAGE_LABEL}. A sua tem ${formatImageSize(bytes)}.`;
}
