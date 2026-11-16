import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { isPollImageWithinLimit } from "./poll-images";
describe("limite de imagem da enquete", () => {
  test("aceita 500 KB", () => strictEqual(isPollImageWithinLimit(500 * 1024), true));
  test("recusa acima de 500 KB", () => strictEqual(isPollImageWithinLimit(500 * 1024 + 1), false));
});
