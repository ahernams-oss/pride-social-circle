import { describe, test } from "node:test";
import { strictEqual } from "node:assert";
import { tituloSiglas } from "./vf-credencial";

describe("tituloSiglas", () => {
  test("extrai a sigla de um título da lista oficial", () => {
    strictEqual(tituloSiglas("MJF — Companheiro Melvin Jones"), "MJF");
    strictEqual(tituloSiglas("PDG — Past-Governador Distrital"), "PDG");
  });

  test("mantém títulos conjugados digitados livremente", () => {
    strictEqual(tituloSiglas("MJF PDG"), "MJF PDG");
  });

  test("retorna vazio quando não há título", () => {
    strictEqual(tituloSiglas(null), "");
    strictEqual(tituloSiglas(undefined), "");
    strictEqual(tituloSiglas("   "), "");
  });
});
