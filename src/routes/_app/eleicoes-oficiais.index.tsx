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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Gavel, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/eleicoes-oficiais/")({ component: Page });

type Eleicao = {
  id: string;
  titulo: string;
  descricao: string | null;
  distrito: string | null;
  data_eleicao: string;
  status: "configurando" | "credenciamento" | "votacao_aberta" | "votacao_encerrada" | "apurada";
  created_at: string;
};

const STATUS_LABEL: Record<Eleicao["status"], string> = {
  configurando: "Configurando",
  credenciamento: "Credenciamento",
  votacao_aberta: "Votação aberta",
  votacao_encerrada: "Encerrada",
  apurada: "Apurada",
};
const STATUS_VARIANT: Record<Eleicao["status"], "default" | "secondary" | "outline"> = {
  configurando: "outline",
  credenciamento: "secondary",
  votacao_aberta: "default",
  votacao_encerrada: "secondary",
  apurada: "secondary",
};

function Page() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Eleicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: "", descricao: "", distrito: "", data_eleicao: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vf_eleicoes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar eleições");
    setItems((data ?? []) as Eleicao[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!user) return;
    if (!form.titulo || !form.data_eleicao) return toast.error("Título e data são obrigatórios");
    const { error } = await supabase.from("vf_eleicoes").insert({
      titulo: form.titulo,
      descricao: form.descricao || null,
      distrito: form.distrito || null,
      data_eleicao: form.data_eleicao,
      created_by: user.id,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Eleição criada");
    setOpen(false);
    setForm({ titulo: "", descricao: "", distrito: "", data_eleicao: "" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Gavel className="h-6 w-6 text-primary" /> Eleições Oficiais
          </h1>
          <p className="text-sm text-muted-foreground">
            Eleições oficiais de Distrito com credenciamento de delegados e apuração auditável.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova eleição</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova eleição</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5"><Label>Título</Label>
                  <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Distrito</Label>
                  <Input placeholder="LC-11" value={form.distrito} onChange={(e) => setForm({ ...form, distrito: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Data da eleição</Label>
                  <Input type="date" value={form.data_eleicao} onChange={(e) => setForm({ ...form, data_eleicao: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Descrição</Label>
                  <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={create}>Criar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Nenhuma eleição cadastrada.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((e) => (
            <Link key={e.id} to="/eleicoes-oficiais/$id" params={{ id: e.id }}>
              <Card className="transition hover:shadow-md">
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{e.titulo}</h3>
                    <Badge variant={STATUS_VARIANT[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.distrito ? `${e.distrito} · ` : ""}{new Date(e.data_eleicao).toLocaleDateString("pt-BR")}
                  </div>
                  {e.descricao && <p className="line-clamp-2 text-sm text-foreground/80">{e.descricao}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}