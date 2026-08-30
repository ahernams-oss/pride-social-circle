import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Target,
  UserCheck,
  UserX,
  Users,
  Vote,
} from "lucide-react";

type ProfileRow = {
  id: string;
  full_name: string;
  club_name: string;
  city: string;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected";
  is_active: boolean;
  access_level: string | null;
  created_at: string;
};

type AuditRow = {
  id: string;
  target_user_id: string;
  old_level: string;
  new_level: string;
  reason: string | null;
  created_at: string;
};

const COUNT_TABLES = [
  { key: "posts", table: "posts", label: "Publicações", icon: MessageSquare },
  { key: "events", table: "events", label: "Eventos", icon: CalendarDays },
  { key: "documents", table: "documents", label: "Documentos", icon: FileText },
  { key: "missions", table: "missions", label: "Missões", icon: Target },
  { key: "clubs", table: "clubs", label: "Clubes", icon: Users },
  { key: "elections", table: "vf_eleicoes", label: "Eleições oficiais", icon: Vote },
] as const;

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function fmtDate(v: string) {
  return new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "text-[#2bb80f]"
      : tone === "warning"
        ? "text-amber-500"
        : tone === "danger"
          ? "text-destructive"
          : "text-primary";
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function AdminDashboard() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [levels, setLevels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: profs }, { data: aud }, { data: lv }, ...tableCounts] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, club_name, city, avatar_url, status, is_active, access_level, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("access_level_audit")
          .select("id, target_user_id, old_level, new_level, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("access_levels").select("key, label"),
        ...COUNT_TABLES.map((t) => supabase.from(t.table).select("id", { count: "exact", head: true })),
      ]);

      setProfiles((profs ?? []) as ProfileRow[]);
      setAudit((aud ?? []) as AuditRow[]);
      setLevels(Object.fromEntries(((lv ?? []) as { key: string; label: string }[]).map((l) => [l.key, l.label])));
      const c: Record<string, number> = {};
      COUNT_TABLES.forEach((t, i) => {
        c[t.key] = (tableCounts[i] as { count: number | null }).count ?? 0;
      });
      setCounts(c);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = profiles.length;
    const pending = profiles.filter((p) => p.status === "pending").length;
    const approved = profiles.filter((p) => p.status === "approved").length;
    const rejected = profiles.filter((p) => p.status === "rejected").length;
    const inactive = profiles.filter((p) => !p.is_active).length;
    const last30 = profiles.filter(
      (p) => Date.now() - new Date(p.created_at).getTime() < 30 * 864e5,
    ).length;
    return { total, pending, approved, rejected, inactive, last30 };
  }, [profiles]);

  const signupSeries = useMemo(() => {
    const months: { key: string; label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("pt-BR", { month: "short" }),
        total: 0,
      });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    profiles.forEach((p) => {
      const d = new Date(p.created_at);
      const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i !== undefined) months[i].total++;
    });
    return months;
  }, [profiles]);

  const levelSeries = useMemo(() => {
    const m = new Map<string, number>();
    profiles.forEach((p) => {
      const key = p.access_level ?? (p.status === "approved" ? "approved" : "user");
      m.set(key, (m.get(key) ?? 0) + 1);
    });
    return [...m.entries()].map(([key, value]) => ({ name: levels[key] ?? key, value }));
  }, [profiles, levels]);

  const pieColors = ["hsl(var(--primary))", "#39FF14", "#f59e0b", "#6366f1", "#ef4444", "#0ea5e9"];

  const recent = profiles.slice(0, 6);
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "Usuário";

  if (loading) {
    return <p className="rounded-xl border bg-card p-12 text-center text-muted-foreground">Carregando indicadores…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Associados cadastrados" value={stats.total} hint={`${stats.last30} nos últimos 30 dias`} icon={Users} />
        <StatCard label="Aprovados" value={stats.approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Pendentes de aprovação" value={stats.pending} icon={Clock} tone="warning" />
        <StatCard label="Contas desativadas" value={stats.inactive} hint={`${stats.rejected} rejeitado(s)`} icon={UserX} tone="danger" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {COUNT_TABLES.map((t) => (
          <StatCard key={t.key} label={t.label} value={counts[t.key] ?? 0} icon={t.icon} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Novos cadastros por mês</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupSeries}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" name="Cadastros" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Distribuição por nível de acesso</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={levelSeries} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {levelSeries.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2">
            {levelSeries.map((l, i) => (
              <span key={l.name} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: pieColors[i % pieColors.length] }} />
                {l.name} ({l.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Últimos cadastros</h2>
          <div className="space-y-3">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cadastro ainda.</p>}
            {recent.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(p.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.full_name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.club_name || "—"} · {fmtDate(p.created_at)}
                  </div>
                </div>
                <Badge variant={p.status === "approved" ? "default" : "secondary"}>{p.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Auditoria recente de níveis</h2>
          <div className="space-y-3">
            {audit.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>}
            {audit.map((a) => (
              <div key={a.id} className="rounded-lg border p-3 text-xs">
                <div className="font-medium">{nameOf(a.target_user_id)}</div>
                <div className="text-muted-foreground">
                  {levels[a.old_level] ?? a.old_level} → <strong>{levels[a.new_level] ?? a.new_level}</strong> ·{" "}
                  {fmtDate(a.created_at)}
                </div>
                {a.reason && <div className="mt-1 text-muted-foreground">{a.reason}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
