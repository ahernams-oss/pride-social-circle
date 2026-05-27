import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

const searchSchema = z.object({ c: z.string().optional() });

export const Route = createFileRoute("/_app/messages")({
  validateSearch: searchSchema,
  component: MessagesPage,
});

type ConvRow = {
  conversation_id: string;
  last_message_at: string;
  other: { id: string; full_name: string; avatar_url: string | null } | null;
  last_message: string;
};

type Msg = { id: string; sender_id: string; content: string; created_at: string };

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function MessagesPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { c: selectedId } = Route.useSearch();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConvs = useCallback(async () => {
    if (!user) return;
    const { data: parts } = await supabase
      .from("conversation_participants").select("conversation_id").eq("user_id", user.id);
    const ids = (parts ?? []).map((p: any) => p.conversation_id);
    if (!ids.length) { setConvs([]); return; }

    const { data: cs } = await supabase
      .from("conversations").select("id, last_message_at").in("id", ids)
      .order("last_message_at", { ascending: false });

    const { data: allParts } = await supabase
      .from("conversation_participants").select("conversation_id, user_id").in("conversation_id", ids);

    const otherIds = Array.from(new Set(
      (allParts ?? []).filter((p: any) => p.user_id !== user.id).map((p: any) => p.user_id)
    ));
    const { data: profs } = otherIds.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", otherIds)
      : { data: [] as any[] };
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));

    const { data: lastMsgs } = await supabase
      .from("messages").select("conversation_id, content, created_at")
      .in("conversation_id", ids).order("created_at", { ascending: false });
    const lastMap = new Map<string, string>();
    (lastMsgs ?? []).forEach((m: any) => {
      if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m.content);
    });

    const rows: ConvRow[] = (cs ?? []).map((cv: any) => {
      const otherId = (allParts ?? []).find((p: any) => p.conversation_id === cv.id && p.user_id !== user.id)?.user_id;
      return {
        conversation_id: cv.id,
        last_message_at: cv.last_message_at,
        other: otherId ? (pmap.get(otherId) ?? { id: otherId, full_name: "Associado", avatar_url: null }) : null,
        last_message: lastMap.get(cv.id) ?? "",
      };
    });
    setConvs(rows);
  }, [user]);

  const loadMessages = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from("messages").select("id, sender_id, content, created_at")
      .eq("conversation_id", cid).order("created_at", { ascending: true });
    setMessages((data ?? []) as Msg[]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);
  useEffect(() => { if (selectedId) loadMessages(selectedId); }, [selectedId, loadMessages]);

  useEffect(() => {
    if (!selectedId) return;
    const ch = supabase.channel(`msg-${selectedId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          setMessages((m) => [...m, payload.new as Msg]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          loadConvs();
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedId, loadConvs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedId || !text.trim()) return;
    const content = text.trim();
    setText("");
    await supabase.from("messages").insert({ conversation_id: selectedId, sender_id: user.id, content });
  };

  return (
    <div className="grid h-[calc(100vh-180px)] grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
      <aside className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-3 font-semibold">Conversas</div>
        <div className="max-h-full overflow-y-auto">
          {convs.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma conversa ainda. Abra o perfil de um associado para iniciar.
            </p>
          ) : (
            convs.map((c) => (
              <button
                key={c.conversation_id}
                onClick={() => nav({ to: "/messages", search: { c: c.conversation_id } })}
                className={`flex w-full items-center gap-3 border-b px-3 py-3 text-left hover:bg-muted ${
                  selectedId === c.conversation_id ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c.other?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(c.other?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.other?.full_name ?? "Associado"}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.last_message || "Sem mensagens"}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="flex flex-col overflow-hidden rounded-xl border bg-card">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                      <div className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t p-3">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva uma mensagem..." />
              <Button type="submit" disabled={!text.trim()}>Enviar</Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
