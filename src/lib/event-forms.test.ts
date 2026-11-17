import { describe, test } from "node:test";
import { strictEqual, notStrictEqual } from "node:assert";
import { validateForm, answerText, type FormQuestion } from "@/components/EventForms";
const q = (p: Partial<FormQuestion>): FormQuestion => ({ id: "q", text: "Pergunta", type: "single", options: ["A", "B"], required: true, ...p });
describe("event forms", () => {
  test("exige ao menos 2 opções em perguntas de escolha", () => notStrictEqual(validateForm("T", [q({ options: ["A", ""] })]), null));
  test("aceita pergunta escrita sem opções", () => strictEqual(validateForm("T", [q({ type: "text", options: [] })]), null));
  test("formata múltiplas respostas", () => strictEqual(answerText(q({ type: "multiple" }), { q: ["A", "B"] }), "A, B"));
});
