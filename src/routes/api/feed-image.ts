import { createFileRoute } from "@tanstack/react-router";

// Serve imagens do bucket privado "feed-images" para usuários autenticados,
// sem expor URLs assinadas ou o caminho real de armazenamento.
export const Route = createFileRoute("/api/feed-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("path") ?? "";
        // Formato esperado: "<uuid>/<arquivo>" — sem subpastas extras nem traversal.
        if (!/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,200}$/.test(path)) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("feed-images").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(data, {
          headers: {
            "Content-Type": data.type || "image/jpeg",
            "Cache-Control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
