import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { canEditPost } from "./post-edit";
const t0 = "2026-01-01T00:00:00.000Z";
const base = new Date(t0).getTime();
describe("canEditPost", () => {
  test("permite editar antes de 3 minutos", () => strictEqual(canEditPost(t0, base + 179_000), true));
  test("bloqueia após 3 minutos", () => strictEqual(canEditPost(t0, base + 180_000), false));
});
