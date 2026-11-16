import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL, isWithinImageLimit, imageLimitMessage } from "./feed-image-limit";

describe("limite de imagem do feed", () => {
  test("o limite é de 300 KB", () => {
    strictEqual(MAX_IMAGE_BYTES, 307200);
    strictEqual(MAX_IMAGE_LABEL, "300 KB");
  });

  test("aceita imagem exatamente em 300 KB", () => strictEqual(isWithinImageLimit(300 * 1024), true));
  test("rejeita imagem acima de 300 KB", () => strictEqual(isWithinImageLimit(300 * 1024 + 1), false));
  test("aceita imagem pequena", () => strictEqual(isWithinImageLimit(1024), true));

  test("a mensagem informa o tamanho enviado", () =>
    strictEqual(imageLimitMessage(500 * 1024), "A imagem deve ter no máximo 300 KB. A sua tem 500 KB."));
});
