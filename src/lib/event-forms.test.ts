import { describe, expect, it } from "bun:test";
import { validateForm, answerText, type FormQuestion } from "@/components/EventForms";
const q = (p: Partial<FormQuestion>): FormQuestion => ({ id: "q", text: "Pergunta", type: "single", options: ["A", "B"], required: true, ...p });
describe("event forms", () => {
  it("exige ao menos 2 opções em perguntas de escolha", () => expect(validateForm("T", [q({ options: ["A", ""] })])).not.toBeNull());
  it("aceita pergunta escrita sem opções", () => expect(validateForm("T", [q({ type: "text", options: [] })])).toBeNull());
  it("formata múltiplas respostas", () => expect(answerText(q({ type: "multiple" }), { q: ["A", "B"] })).toBe("A, B"));
});
