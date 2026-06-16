import { createFileRoute, useParams } from "@tanstack/react-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ElectionDetail } from "@/components/ElectionDetail";

export const Route = createFileRoute("/_app/elections/$id")({ component: ElectionDetailPage });

function ElectionDetailPage() {
  const { id } = useParams({ from: "/_app/elections/$id" });
  const { user, isAdmin } = useAuth();
  return (
    <ElectionDetail
      electionId={id}
      isAdmin={isAdmin}
      voterId={user?.id ?? null}
      client={supabase as unknown as SupabaseClient}
    />
  );
}
