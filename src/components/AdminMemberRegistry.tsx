import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Search, Trash2, Upload } from "lucide-react";
import { formatCpf, parseRegistryRows, type RegistryEntry } from "@/lib/registry";

type Row = RegistryEntry & { id: string; created_at: string };

const TEMPLATE = "Nome;CPF;Numero Lion;Data de Nascimento\nMaria Souza;12345678901;1234567;01/02/1970\n";

export function AdminMemberRegistry() {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("member_registry")
      .select("id, full_name, cpf, lion_number, birth_date, created_at")
      .order("full_name");
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.full_name, r.cpf, r.lion_number].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query]);

  const onFile = async (file: File) => {
    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("Planilha vazia");
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, { defval: "" });
      const { valid, invalid } = parseRegistryRows(json);

      if (valid.length === 0) {
        toast.error("Nenhuma linha válida encontrada. Verifique as colunas Nome, CPF, Número Lion e Data de Nascimento.");
        return;
      }

      const { error } = await supabase
        .from("member_registry")
        .upsert(valid, { onConflict: "cpf" });
      if (error) throw new Error(error.message);

      toast.success(
        `${valid.length} associado(s) importado(s)${invalid.length ? ` · ${invalid.length} linha(s) ignorada(s)` : ""}`,
      );
      if (invalid.length) {
        toast.warning(
          `Linhas ignoradas: ${invalid.slice(0, 5).map((i) => `${i.line} (${i.reason})`).join(", ")}${invalid.length > 5 ? "…" : ""}`,
        );
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao importar arquivo");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeRow = async (id: string) => {
    const { error } = await supabase.from("member_registry").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const clearAll = async () => {
    if (!confirm("Remover todos os registros da base oficial?")) return;
    const { error } = await supabase.from("member_registry").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return toast.error(error.message);
    toast.success("Base limpa");
    load();
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-associados.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Base oficial de associados</h2>
          <Badge variant="secondary">{rows.length} registro(s)</Badge>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-1 h-4 w-4" /> Modelo CSV
            </Button>
            <Button size="sm" disabled={importing} onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> {importing ? "Importando…" : "Importar Excel/CSV"}
            </Button>
            {rows.length > 0 && (
              <Button variant="destructive" size="sm" onClick={clearAll}>
                <Trash2 className="mr-1 h-4 w-4" /> Limpar base
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Colunas aceitas: <strong>Nome</strong>, <strong>CPF</strong>, <strong>Número Lion</strong> e{" "}
          <strong>Data de Nascimento</strong>. CPFs repetidos são atualizados.
        </p>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b p-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, CPF ou número Lion"
              className="pl-9"
            />
          </div>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhum associado na base oficial.</p>
        ) : (
          <ul className="divide-y text-sm">
            {filtered.slice(0, 300).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="min-w-0 flex-1 truncate font-medium">{r.full_name}</span>
                <span className="text-muted-foreground">{formatCpf(r.cpf)}</span>
                <Badge variant="outline">Lion {r.lion_number}</Badge>
                <span className="text-xs text-muted-foreground">
                  {r.birth_date ? new Date(`${r.birth_date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}
                </span>
                <Button size="icon" variant="ghost" onClick={() => removeRow(r.id)} aria-label="Remover">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
