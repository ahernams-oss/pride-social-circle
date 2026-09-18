import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAccess } from "@/lib/access-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Plus, Trash2, Check, Clock, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/missions")({ component: MissionsPage });

type Mission = {
  id: string;
  title: string;
  description: string | null;
  points: number;
  created_by: string;
};

type Completion = {
  id: string;
  mission_id: string;
  user_id: string;
  status: string;
  approved_at: string | null;
};

type Profile = { id: string; full_name: string };

function MissionsPage() {
  const { user, isAdmin } = useAuth();
  const { can } = useAccess();
  const canApprove = isAdmin || can("missions", "approve");
  const canCreate = isAdmin || can("missions", "create");

  const [missions, setMissions] = useState<Mission[]>([]);
  const [mine, setMine] = useState<Completion[]>([]);
  const [pending, setPending] = useState<Completion[]>([]);
  const [people, setPeople] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const { data: m } = await supabase.from("missions").select("*").order("created_at", { ascending: false });
    setMissions((m as Mission[]) ?? []);

    if (user) {
      const { data: c } = await supabase
        .from("mission_completions")
        .select("id, mission_id, user_id, status, approved_at")
        .eq("user_id", user.id);
      setMine((c as Completion[]) ?? []);
    }

    if (canApprove) {
      const { data: p } = await supabase
        .from("mission_completions")
        .select("id, mission_id, user_id, status, approved_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const list = (p as Completion[]) ?? [];
      setPending(list);
      const ids = [...new Set(list.map((x) => x.user_id))];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        setPeople(Object.fromEntries(((profs as Profile[]) ?? []).map((x) => [x.id, x.full_name])));
      } else {
        setPeople({});
      }
    } else {
      setPending([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canApprove]);

  const byMission = useMemo(() => new Map(mine.map((c) => [c.mission_id, c])), [mine]);
  const missionById = useMemo(() => new Map(missions.map((m) => [m.id, m])), [missions]);

  const myPoints = useMemo(
    () =>
      mine
        .filter((c) => c.status === "approved")
        .reduce((sum, c) => sum + (missionById.get(c.mission_id)?.points ?? 0), 0),
    [mine, missionById],
  );

  const create = async () => {
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("missions").insert({
      title: title.trim(),
      description: description.trim() || null,
      points,
      created_by: user.id,
    });
    if (error) return toast.error(error.message);
    setTitle(""); setDescription(""); setPoints(1); setShowForm(false);
    toast.success("Missão criada");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggle = async (m: Mission) => {
    if (!user) return;
    const current = byMission.get(m.id);
    if (current) {
      if (current.status === "approved") {
        return toast.info("Missão já confirmada — fale com um membro autorizado para reverter.");
      }
      const { error } = await supabase.from("mission_completions").delete().eq("id", current.id);
      if (error) return toast.error(error.message);
      toast.success("Envio cancelado.");
    } else {
      const { error } = await supabase
        .from("mission_completions")
        .insert({ mission_id: m.id, user_id: user.id, status: "pending" });
      if (error) return toast.error(error.message);
      toast.success("Enviado para confirmação de um membro autorizado.");
    }
    load();
  };

  const review = async (c: Completion, status: "approved" | "rejected") => {
    if (!user) return;
    const { error } = await supabase
      .from("mission_completions")
      .update({ status, approved_by: user.id, approved_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Missão confirmada — pontos computados." : "Conclusão recusada.");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Missões</h1>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> Nova missão
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Conclua missões e aguarde a confirmação de um membro autorizado para somar pontos no ranking.
        Você tem <strong className="text-primary">{myPoints}</strong> ponto{myPoints === 1 ? "" : "s"} confirmado{myPoints === 1 ? "" : "s"}.
      </p>

      {showForm && canCreate && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nova missão</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Pontos:</label>
              <Input type="number" min={1} value={points} onChange={(e) => setPoints(Math.max(1, Number(e.target.value) || 1))} className="w-24" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={create}>Criar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canApprove && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" /> Confirmações pendentes
              <Badge variant="secondary">{pending.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{people[c.user_id] ?? "Associado"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {missionById.get(c.mission_id)?.title ?? "Missão"} · {missionById.get(c.mission_id)?.points ?? 0} pts
                  </div>
                </div>
                <Button size="sm" onClick={() => review(c, "approved")}>
                  <Check className="mr-1 h-4 w-4" /> Confirmar
                </Button>
                <Button size="sm" variant="outline" onClick={() => review(c, "rejected")}>
                  <X className="mr-1 h-4 w-4" /> Recusar
                </Button>
              </div>
            ))}
            {pending.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma confirmação pendente.</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {missions.map((m) => {
          const c = byMission.get(m.id);
          const done = c?.status === "approved";
          const waiting = c?.status === "pending";
          const rejected = c?.status === "rejected";
          return (
            <div key={m.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
              <button
                onClick={() => toggle(m)}
                className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : waiting
                      ? "border-amber-500 text-amber-600"
                      : "border-muted-foreground/40 hover:border-primary"
                }`}
                aria-label={done ? "Concluída" : waiting ? "Aguardando confirmação" : "Marcar como concluída"}
              >
                {done && <Check className="h-4 w-4" />}
                {waiting && <Clock className="h-3.5 w-3.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{m.title}</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {m.points} {m.points > 1 ? "pts" : "pt"}
                  </span>
                  {waiting && <Badge variant="outline" className="text-amber-600">Aguardando confirmação</Badge>}
                  {done && <Badge variant="secondary">Confirmada</Badge>}
                  {rejected && <Badge variant="destructive">Recusada</Badge>}
                </div>
                {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
              </div>
              {(isAdmin || can("missions", "delete")) && (
                <Button variant="ghost" size="icon" onClick={() => remove(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
        {missions.length === 0 && (
          <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Nenhuma missão ainda.</p>
        )}
      </div>
    </div>
  );
}
