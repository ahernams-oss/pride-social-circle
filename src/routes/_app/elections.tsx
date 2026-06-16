import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Vote, Plus, Play, Square, Monitor, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/elections")({ component: ElectionsPage });

type ElectionType = "single" | "yes_no" | "multiple_choice" | "multi_position";
type ElectionStatus = "draft" | "open" | "closed";

type Election = {
  id: string;
  title: string;
  description: string | null;
  type: ElectionType;
  status: ElectionStatus;
  starts_at: string | null;
  ends_at: string | null;
  max_choices: number;
  allow_kiosk: boolean;
  created_at: string;
};

const TYPE_LABEL: Record<ElectionType, string> = {
  single: "Cargo único",
  yes_no: "Sim / Não",
  multiple_choice: "Múltipla escolha",
  multi_position: "Chapa (vários cargos)",
};
const STATUS_VARIANT: Record<ElectionStatus, "default" | "secondary" | "outline"> = {
  draft: "outline",
  open: "default",
  closed: "secondary",
};

function ElectionsPage() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Election[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("elections")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar eleições");
    setItems((data ?? []) as Election[]);
    if (user) {
      const { data: bs } = await supabase
        .from("election_ballots")
        .select("election_id")
        .eq("voter_id", user.id);
      setVotedIds(new Set((bs ?? []).map((b: any) => b.election_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: ElectionStatus) => {
    const { error } = await supabase.from("elections").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "open" ? "Eleição aberta" : status === "closed" ? "Eleição encerrada" : "Atualizado");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Votações</h1>
          <p className="text-sm text-muted-foreground">
            Acesse as eleições disponíveis. Sua autenticação é o próprio login.
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button asChild variant="outline">
              <Link to="/kiosk"><Monitor className="mr-2 h-4 w-4" /> Modo Kiosk</Link>
            </Button>
          )}
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Nova eleição</Button>
              </DialogTrigger>
              <CreateDialog onClose={() => { setOpen(false); load(); }} />
            </Dialog>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma eleição cadastrada.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {items.map((e) => {
            const voted = votedIds.has(e.id);
            return (
              <Card key={e.id}>
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{e.title}</h3>
                      <Badge variant={STATUS_VARIANT[e.status]}>{e.status === "open" ? "Aberta" : e.status === "closed" ? "Encerrada" : "Rascunho"}</Badge>
                      <Badge variant="outline">{TYPE_LABEL[e.type]}</Badge>
                      {e.allow_kiosk && <Badge variant="outline">Kiosk</Badge>}
                      {voted && <Badge className="bg-emerald-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> Você votou</Badge>}
                    </div>
                    {e.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant={e.status === "open" && !voted ? "default" : "outline"}>
                      <Link to="/elections/$id" params={{ id: e.id }}>
                        <Vote className="mr-2 h-4 w-4" />
                        {e.status === "open" ? (voted ? "Ver" : "Votar") : "Detalhes"}
                      </Link>
                    </Button>
                    {isAdmin && e.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, "open")}>
                        <Play className="mr-2 h-4 w-4" /> Abrir
                      </Button>
                    )}
                    {isAdmin && e.status === "open" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(e.id, "closed")}>
                        <Square className="mr-2 h-4 w-4" /> Encerrar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ElectionType>("single");
  const [allowKiosk, setAllowKiosk] = useState(false);
  const [maxChoices, setMaxChoices] = useState(1);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("elections").insert({
      title: title.trim(),
      description: description.trim() || null,
      type,
      allow_kiosk: allowKiosk,
      max_choices: type === "multiple_choice" ? Math.max(1, maxChoices) : 1,
      created_by: user.id,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Eleição criada. Adicione candidatos/opções na próxima tela.");
    onClose();
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Nova eleição</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as ElectionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Cargo único (1 vencedor)</SelectItem>
              <SelectItem value="yes_no">Sim / Não (referendo)</SelectItem>
              <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
              <SelectItem value="multi_position">Chapa (vários cargos)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "multiple_choice" && (
          <div className="space-y-1">
            <Label>Máx. de opções marcadas</Label>
            <Input type="number" min={1} value={maxChoices} onChange={(e) => setMaxChoices(parseInt(e.target.value) || 1)} />
          </div>
        )}
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Permitir Kiosk</div>
            <div className="text-xs text-muted-foreground">Admin pode coletar votos presencialmente.</div>
          </div>
          <Switch checked={allowKiosk} onCheckedChange={setAllowKiosk} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit} disabled={saving || !title.trim()}>Criar</Button>
      </DialogFooter>
    </DialogContent>
  );
}
