import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function LionsAwards({ category, userId, compact = false }: { category: "curso" | "certificado" | "titulo"; userId?: string; compact?: boolean }) {
  const { user } = useAuth();
  const recipientId = userId ?? user?.id;
  const { data } = useSuspenseQuery({
    queryKey: ["my-lions-awards", recipientId, category],
    queryFn: async () => {
      if (!user || !recipientId) return [];
      const { data, error } = await supabase.from("member_lions_awards").select("*").eq("user_id", recipientId).eq("category", category).order("awarded_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!data.length) return <p className={compact ? "text-sm text-muted-foreground" : "border-t py-12 text-center text-muted-foreground"}>Nenhum registro disponível.</p>;
  return <div className="space-y-3">{data.map((item) => <article key={item.id} className={compact ? "border-b py-3 last:border-b-0" : "rounded-lg border bg-card p-4"}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words font-semibold">{item.title}</h3><Badge variant="secondary">{new Date(`${item.awarded_on}T12:00:00`).toLocaleDateString("pt-BR")}</Badge></div>
    {item.institution && <p className="mt-1 text-sm text-muted-foreground">{item.institution}</p>}
    {item.description && <p className="mt-2 whitespace-pre-wrap text-sm">{item.description}</p>}
    {item.document_url && /^https?:\/\//i.test(item.document_url) && <Button asChild size="sm" variant="outline" className="mt-3"><a href={item.document_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Ver documento</a></Button>}
  </article>)}</div>;
}