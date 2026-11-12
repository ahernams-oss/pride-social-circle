import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateResponse } from "@lovable.dev/ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const g = z.array(z.object({ nome: z.string(), participantes: z.number(), acompanhantes: z.number(), lions: z.number(), total: z.number() }));
const schema = z.object({
  title: z.string().max(300),
  participantes: z.number(), acompanhantes: z.number(), desistencias: z.number(),
  clubes: g.max(200), estados: g.max(50),
});

export const generateEventInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas administradores podem gerar o resumo");
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      instructions: "Você é analista do Distrito LC-11 do Lions Clube. Escreva em português do Brasil um resumo executivo em Markdown curto com as seções: Visão geral, Destaques por clube, Destaques por estado, Pontos de atenção e Ações recomendadas (3 a 5 ações concretas). Use apenas os dados fornecidos; cite números.",
      input: JSON.stringify(data),
    });
    let text = "";
    for (const item of res.output ?? []) {
      if (item.type === "message") for (const c of item.content) if (c.type === "output_text") text += c.text;
    }
    return { text: text || "Não foi possível gerar o resumo." };
  });
