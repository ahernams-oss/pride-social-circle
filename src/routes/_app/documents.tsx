import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/documents")({ component: DocumentsPage });

const CATEGORIES = ["Atas", "Estatutos", "Financeiro", "Projetos", "Comunicados", "Outros"] as const;
type Category = typeof CATEGORIES[number];

type Doc = {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function DocumentsPage() {
  const { user, isAdmin } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category | "Todos">("Todos");
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar documentos");
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (doc: Doc) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60);
    if (error || !data) return toast.error("Não foi possível gerar o link");
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`Remover "${doc.title}"?`)) return;
    const { error: sErr } = await supabase.storage.from("documents").remove([doc.file_path]);
    if (sErr) return toast.error("Erro ao remover arquivo");
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) return toast.error("Erro ao remover registro");
    toast.success("Documento removido");
    load();
  };

  const filtered = filter === "Todos" ? docs : docs.filter((d) => d.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground">Biblioteca compartilhada do clube.</p>
        </div>
        {isAdmin && user && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Upload className="mr-2 h-4 w-4" /> Enviar documento</Button>
            </DialogTrigger>
            <UploadDialog
              userId={user.id}
              onDone={() => { setOpen(false); load(); }}
            />
          </Dialog>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Category | "Todos")}>
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="Todos">Todos</TabsTrigger>
          {CATEGORIES.map((c) => <TabsTrigger key={c} value={c}>{c}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      {loading ? (
        <p className="py-12 text-center text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-lg font-semibold">Nenhum documento</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin ? "Envie o primeiro documento para a biblioteca." : "Aguarde a diretoria publicar documentos."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex items-start gap-4 p-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold leading-tight">{doc.title}</h3>
                    <Badge variant="secondary">{doc.category}</Badge>
                  </div>
                  {doc.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{doc.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {doc.file_name} · {formatSize(doc.file_size)} ·{" "}
                    {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(doc)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadDialog({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Atas");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim() || !file) return toast.error("Preencha o título e selecione um arquivo");
    if (file.size > 20 * 1024 * 1024) return toast.error("Arquivo maior que 20MB");
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (upErr) { setBusy(false); return toast.error("Falha no upload"); }
    const { error } = await supabase.from("documents").insert({
      title: title.trim(),
      description: description.trim() || null,
      category,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: userId,
    });
    setBusy(false);
    if (error) {
      await supabase.storage.from("documents").remove([path]);
      return toast.error("Erro ao salvar documento");
    }
    toast.success("Documento enviado");
    setTitle(""); setDescription(""); setFile(null);
    onDone();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Enviar documento</DialogTitle>
        <DialogDescription>Adicione um arquivo à biblioteca do clube.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
        </div>
        <div>
          <Label htmlFor="desc">Descrição (opcional)</Label>
          <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
        </div>
        <div>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="file">Arquivo (até 20MB)</Label>
          <Input id="file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={submit} disabled={busy}>{busy ? "Enviando..." : "Enviar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
