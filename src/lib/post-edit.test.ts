import { describe, it, expect } from "vitest";
import { canEditPost } from "./post-edit";
const t0 = "2026-01-01T00:00:00.000Z";
const base = new Date(t0).getTime();
describe("canEditPost", () => {
  it("permite editar antes de 3 minutos", () => expect(canEditPost(t0, base + 179_000)).toBe(true));
  it("bloqueia após 3 minutos", () => expect(canEditPost(t0, base + 180_000)).toBe(false));
});
