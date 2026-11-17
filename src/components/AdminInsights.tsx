import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Clock, MessageSquare, Heart, PenSquare, Users, Activity } from "lucide-react";
import { toast } from "sonner";
import { exportReportExcel, exportReportPdf, type Report } from "@/lib/admin-reports";

type Stat = {
  user_id: string; full_name: string; club_name: string; avatar_url: string | null;
  seconds_online: number; last_seen_at: string | null; posts: number; comments: number;
  likes_given: number; likes_received: number; messages: number; poll_votes: number;
  events_joined: number; missions_done: number;
};
type Period = "7" | "30" | "90" | "all";

export const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}min` : `${m}min`;
};
const interactions = (r: Stat) => r.posts + r.comments + r.likes_given + r.messages + r.poll_votes;

export function AdminInsights() {
  const [period, setPeriod] = useState<Period>("30");
  const [rows, setRows] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const since = period === "all" ? null : new Date(Date.now() - Number(period) * 864e5).toISOString().slice(0, 10);
    supabase.rpc("management_stats", { _since: since ?? undefined }).then(({ data, error }) => {
      if (error) toast.error(error.message);
      setRows(((data ?? []) as any[]).map((r) => ({ ...r,
        ...Object.fromEntries(["seconds_online","posts","comments","likes_given","likes_received","messages","poll_votes","events_joined","missions_done"].map((k) => [k, Number(r[k] ?? 0)])) })));
      setLoading(false);
    });
  }, [period]);

  const totals = useMemo(() => rows.reduce((a, r) => ({
    secs: a.secs + r.seconds_online, posts: a.posts + r.posts, likes: a.likes + r.likes_given,
    comments: a.comments + r.comments, messages: a.messages + r.messages,
    active: a.active + (interactions(r) > 0 || r.seconds_online > 0 ? 1 : 0),
  }), { secs: 0, posts: 0, likes: 0, comments: 0, messages: 0, active: 0 }), [rows]);

  const top = (f: (r: Stat) => number) => [...rows].filter((r) => f(r) > 0).sort((a, b) => f(b) - f(a)).slice(0, 5);
  const label = { "7": "Últimos 7 dias", "30": "Últimos 30 dias", "90": "Últimos 90 dias", all: "Todo o período" }[period];

  const report = (): Report => {
    const sorted = [...rows].sort((a, b) => interactions(b) - interactions(a));
    return { title: `Informações gerenciais — ${label}`, sheets: [
      { name: "Resumo", columns: ["Indicador", "Total"], rows: [
        ["Usuários", rows.length], ["Usuários ativos no período", totals.active],
        ["Tempo conectado (total)", fmtDuration(totals.secs)], ["Publicações", totals.posts],
        ["Curtidas", totals.likes], ["Comentários", totals.comments], ["Mensagens", totals.messages]] },
      { name: "Por usuário", columns: ["Nome", "Clube", "Tempo conectado", "Último acesso", "Publicações", "Comentários", "Curtidas dadas", "Curtidas recebidas", "Mensagens", "Votos em enquetes", "Eventos", "Missões", "Interações"],
        rows: sorted.map((r) => [r.full_name, r.club_name, fmtDuration(r.seconds_online),
          r.last_seen_at ? new Date(r.last_seen_at).toLocaleString("pt-BR") : "—", r.posts, r.comments,
          r.likes_given, r.likes_received, r.messages, r.poll_votes, r.events_joined, r.missions_done, interactions(r)]) },
    ] };
  };

  const Rank = ({ title, icon: Icon, f, fmt = String }: { title: string; icon: any; f: (r: Stat) => number; fmt?: (n: number) => string }) => {
    const list = top(f);
    return (
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" />{title}</div>
        {list.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados no período.</p> : (
          <ol className="space-y-2">
            {list.map((r, i) => (
              <li key={r.user_id} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-muted-foreground">{i + 1}</span>
                <Avatar className="h-7 w-7"><AvatarImage src={r.avatar_url ?? undefined} /><AvatarFallback className="text-[10px]">{r.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                <span className="min-w-0 flex-1 truncate">{r.full_name}</span>
                <span className="font-semibold">{fmt(f(r))}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  };

  const Card = ({ t, v, icon: Icon }: { t: string; v: string | number; icon: any }) => (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-muted-foreground">{t}<Icon className="h-4 w-4 text-primary" /></div>
      <div className="mt-2 text-2xl font-bold">{v}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {(["7", "30", "90", "all"] as Period[]).map((p) => (
            <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
              {{ "7": "7 dias", "30": "30 dias", "90": "90 dias", all: "Tudo" }[p]}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={loading} onClick={() => exportReportPdf(report())}><FileText className="mr-1 h-4 w-4" />Relatório PDF</Button>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => exportReportExcel(report())}><FileSpreadsheet className="mr-1 h-4 w-4" />Relatório Excel</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">O tempo conectado passou a ser medido a partir de hoje; acessos anteriores não foram registrados.</p>
      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (<>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Card t="Ativos no período" v={`${totals.active}/${rows.length}`} icon={Users} />
          <Card t="Tempo conectado" v={fmtDuration(totals.secs)} icon={Clock} />
          <Card t="Publicações" v={totals.posts} icon={PenSquare} />
          <Card t="Curtidas" v={totals.likes} icon={Heart} />
          <Card t="Comentários" v={totals.comments} icon={MessageSquare} />
          <Card t="Mensagens" v={totals.messages} icon={MessageSquare} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Rank title="Mais tempo conectado" icon={Clock} f={(r) => r.seconds_online} fmt={fmtDuration} />
          <Rank title="Mais interage" icon={Activity} f={interactions} />
          <Rank title="Mais publica" icon={PenSquare} f={(r) => r.posts} />
          <Rank title="Mais curte" icon={Heart} f={(r) => r.likes_given} />
          <Rank title="Mais curtido" icon={Heart} f={(r) => r.likes_received} />
          <Rank title="Mais comenta" icon={MessageSquare} f={(r) => r.comments} />
        </div>
      </>)}
    </div>
  );
}
