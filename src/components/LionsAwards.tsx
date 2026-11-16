import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import medalha from "@/assets/medalha-melvin-jones.jpg";

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
  const { data: recipientName } = useSuspenseQuery({
    queryKey: ["lions-award-recipient-name", recipientId],
    queryFn: async () => {
      if (!user || !recipientId) return "";
      const { data } = await supabase.from("profiles").select("full_name").eq("id", recipientId).maybeSingle();
      return data?.full_name ?? "";
    },
  });
  if (!data.length) return <p className={compact ? "text-sm text-muted-foreground" : "border-t py-12 text-center text-muted-foreground"}>Nenhum registro disponível.</p>;
  return <div className="space-y-3">{data.map((item) => <article key={item.id} className={compact ? "border-b py-3 last:border-b-0" : "rounded-lg border bg-card p-4"}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="min-w-0 break-words font-semibold">{item.title}</h3><Badge variant="secondary">{new Date(`${item.awarded_on}T12:00:00`).toLocaleDateString("pt-BR")}</Badge></div>
    {category === "titulo" && <Medal name={recipientName} compact={compact} />}
    {item.institution && <p className="mt-1 text-sm text-muted-foreground">{item.institution}</p>}
    {item.description && <p className="mt-2 whitespace-pre-wrap text-sm">{item.description}</p>}
    {item.document_url && /^https?:\/\//i.test(item.document_url) && <Button asChild size="sm" variant="outline" className="mt-3"><a href={item.document_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Ver documento</a></Button>}
  </article>)}</div>;
}

function Medal({ name, compact }: { name: string; compact: boolean }) {
  return <div className={`relative mx-auto mt-3 w-full ${compact ? "max-w-[220px]" : "max-w-[360px]"}`} style={{ containerType: "inline-size" }}>
    <img src={medalha} alt={`Medalha Melvin Jones de ${name}`} className="block h-auto w-full" loading="lazy" />
    <div className="absolute flex items-center justify-center text-center" style={{ left: "21%", width: "54%", top: "73.5%", height: "6.5%" }}>
      <span className="line-clamp-2 font-serif font-bold uppercase leading-tight" style={{ color: "#3b2a10", fontSize: name.length > 28 ? "3cqw" : "4cqw", textShadow: "0 1px 0 rgba(255,235,170,.7)" }}>{name || "Nome do associado"}</span>
    </div>
  </div>;
}
