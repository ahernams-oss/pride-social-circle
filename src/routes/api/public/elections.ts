import { createFileRoute } from "@tanstack/react-router";

// Public read-only endpoint for the institutional site to consume.
// Returns open & closed elections with aggregated results (closed only).
export const Route = createFileRoute("/api/public/elections")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: elections, error } = await supabaseAdmin
          .from("elections")
          .select("id,title,description,type,status,starts_at,ends_at,created_at")
          .in("status", ["open", "closed"])
          .order("created_at", { ascending: false });
        if (error) return new Response(error.message, { status: 500 });

        const closed = (elections ?? []).filter((e: any) => e.status === "closed").map((e: any) => e.id);
        const resultsByElection: Record<string, any[]> = {};
        for (const id of closed) {
          const { data: r } = await supabaseAdmin.rpc("election_results", { _election_id: id });
          resultsByElection[id] = (r ?? []) as any[];
        }
        return Response.json(
          { elections: elections ?? [], results: resultsByElection },
          { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=30" } },
        );
      },
      OPTIONS: async () => new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }),
    },
  },
});
