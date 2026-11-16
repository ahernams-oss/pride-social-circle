import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Pasta "Imagens_connecta" no Google Drive do Distrito — mantida apenas no servidor,
// nunca exposta ao navegador.
const DRIVE_FOLDER_ID = "1ODlSD2IXpyVeeXmhrcoQ3DVmtkoJPzYf";
const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

const schema = z.object({
  imageUrl: z.string().url().max(2000),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().max(100).default("image/jpeg"),
});

export const backupFeedImageToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const lovKey = process.env["LOVABLE_API_KEY"];
    const connKey = process.env["GOOGLE_DRIVE_API_KEY"];
    if (!lovKey || !connKey) throw new Error("Integração com o Google Drive não configurada");

    const imgRes = await fetch(data.imageUrl);
    if (!imgRes.ok) throw new Error(`Não foi possível ler a imagem (${imgRes.status})`);
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    const boundary = "lc11drive" + Math.random().toString(36).slice(2);
    const meta = JSON.stringify({ name: data.fileName, parents: [DRIVE_FOLDER_ID], mimeType: data.mimeType });
    const enc = new TextEncoder();
    const head = enc.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${data.mimeType}\r\n\r\n`,
    );
    const tail = enc.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(head.length + bytes.length + tail.length);
    body.set(head, 0);
    body.set(bytes, head.length);
    body.set(tail, head.length + bytes.length);

    const res = await fetch(`${GATEWAY}/upload/drive/v3/files?uploadType=multipart`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovKey}`,
        "X-Connection-Api-Key": connKey,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) {
      const t = await res.text();
      console.error(`Drive upload failed [${res.status}]: ${t}`);
      throw new Error(`Falha ao enviar a imagem para o Drive [${res.status}]`);
    }
    const json = (await res.json()) as { id?: string };
    return { id: json.id ?? null };
  });
