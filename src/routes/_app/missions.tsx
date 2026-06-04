import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/missions")({ component: MissionsPage });

type Mission = {
  id: string;
  title: string;
  description: string | null;
  points: number;
  created_by: string;
};

function MissionsPage() {
  const { user, isAdmin } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const { data: m } = await supabase.from("missions").select("*").order("created_at", { ascending: false });
    setMissions((m as Mission[]) ?? []);
    if (user) {
      const { data: c } = await supabase.from("mission_completions").select("mission_id").eq("user_id", user.id);
      setCompleted(new Set((c ?? []).map((x: any) => x.mission_id)));
    }
  };

  useEffect(() => { load(); }, [user]);

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
    if (completed.has(m.id)) {
      await supabase.from("mission_completions").delete().eq("mission_id", m.id).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("mission_completions").insert({ mission_id: m.id, user_id: user.id });
      if (error) return toast.error(error.message);
      toast.success(`+${m.points} ponto${m.points > 1 ? "s" : ""}!`);
    }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Missões</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Nova missão
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Conclua missões para somar pontos no ranking.</p>

      {showForm && (
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

      <div className="space-y-2">
        {missions.map((m) => {
          const done = completed.has(m.id);
          const canDelete = isAdmin || m.created_by === user?.id;
          return (
            <div key={m.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
              <button
                onClick={() => toggle(m)}
                className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 hover:border-primary"
                }`}
                aria-label={done ? "Desmarcar" : "Marcar como concluída"}
              >
                {done && <Check className="h-4 w-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{m.title}</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {m.points} {m.points > 1 ? "pts" : "pt"}
                  </span>
                </div>
                {m.description && <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>}
              </div>
              {canDelete && (
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
