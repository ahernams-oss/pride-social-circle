import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, FileSpreadsheet, Plus, Trash2, Users, BarChart3, FileText } from "lucide-react";
import { toast } from "sonner";

type Companion = { name: string; age: string; is_lion: boolean };

export function AttendButton({ eventId, userId, onChange }: { eventId: string; userId: string; onChange?: () => void }) {
  const [att, setAtt] = useState<{ id: string; count: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [comps, setComps] = useState<Companion[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("event_attendances").select("id, event_companions(id)")
      .eq("event_id", eventId).eq("user_id", userId).is("canceled_at", null).maybeSingle();
    setAtt(data ? { id: data.id, count: (data.event_companions ?? []).length } : null);
  }, [eventId, userId]);
  useEffect(() => { load(); }, [load]);

  const confirm = async () => {
    for (const c of comps) {
      const age = Number(c.age);
      if (!c.name.trim() || c.name.length > 120) return toast.error("Informe o nome de todos os acompanhantes");
      if (!c.age || !Number.isInteger(age) || age < 0 || age > 120) return toast.error(`Idade inválida para ${c.name || "acompanhante"}`);
    }
    setBusy(true);
    const { data, error } = await supabase.from("event_attendances").insert({ event_id: eventId, user_id: userId }).select("id").single();
    if (error) { setBusy(false); return toast.error(error.message); }
    if (comps.length) {
      const { error: e2 } = await supabase.from("event_companions").insert(
        comps.map((c) => ({ attendance_id: data.id, name: c.name.trim(), age: Number(c.age), is_lion: c.is_lion })));
      if (e2) { await supabase.from("event_attendances").delete().eq("id", data.id); setBusy(false); return toast.error(e2.message); }
    }
    setBusy(false); setOpen(false); setComps([]);
    toast.success("Presença confirmada!");
    await load(); onChange?.();
  };

  const cancel = async () => {
    if (!att) return;
    const { error } = await supabase.from("event_attendances").update({ canceled_at: new Date().toISOString() }).eq("id", att.id);
    if (error) return toast.error(error.message);
    toast.success("Presença cancelada"); await load(); onChange?.();
  };

  return (
    <>
      {att ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" /> Você vai{att.count ? ` + ${att.count} acompanhante(s)` : ""}
          </span>
          <Button size="sm" variant="ghost" onClick={cancel}>Cancelar presença</Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>Vou participar</Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Confirmar presença</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Vai levar acompanhantes? Adicione cada um antes de confirmar.</p>
            {comps.map((c, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Acompanhante {i + 1}</span>
                  <Button size="icon" variant="ghost" onClick={() => setComps(comps.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-[1fr_90px] gap-2">
                  <div><Label>Nome</Label><Input maxLength={120} value={c.name} onChange={(e) => setComps(comps.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></div>
                  <div><Label>Idade</Label><Input type="number" min={0} max={120} value={c.age} onChange={(e) => setComps(comps.map((x, j) => j === i ? { ...x, age: e.target.value } : x))} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={c.is_lion} onCheckedChange={(v) => setComps(comps.map((x, j) => j === i ? { ...x, is_lion: !!v } : x))} />
                  É membro do Lions
                </label>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={() => setComps([...comps, { name: "", age: "", is_lion: false }])}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar acompanhante
            </Button>
            <Button className="w-full" disabled={busy} onClick={confirm}>Confirmar presença</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type Row = { nome: string; email: string; telefone: string; clube: string; cidade: string; estado: string; acompanhantes: { name: string; age: number; is_lion: boolean }[]; data: string; desistencia: string | null };

function group(rows: Row[], key: "clube" | "estado") {
  const m = new Map<string, { participantes: number; acompanhantes: number; lions: number }>();
  for (const r of rows) {
    const k = r[key] || "Não informado";
    const g = m.get(k) ?? { participantes: 0, acompanhantes: 0, lions: 0 };
    g.participantes++; g.acompanhantes += r.acompanhantes.length; g.lions += r.acompanhantes.filter((a) => a.is_lion).length;
    m.set(k, g);
  }
  return [...m.entries()].map(([nome, g]) => ({ nome, ...g, total: g.participantes + g.acompanhantes })).sort((a, b) => b.total - a.total);
}

export function EventReport({ eventId, title, open, onOpenChange }: { eventId: string; title: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase.from("event_attendances")
        .select("user_id, created_at, canceled_at, event_companions(name, age, is_lion)").eq("event_id", eventId).order("created_at");
      if (error) return toast.error(error.message);
      const ids = (data ?? []).map((d) => d.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, email, phone, club_name, city, estado").in("id", ids)
        : { data: [] };
      setRows((data ?? []).map((d) => {
        const p = (profs ?? []).find((x) => x.id === d.user_id);
        return { nome: p?.full_name ?? "—", email: p?.email ?? "", telefone: p?.phone ?? "", clube: p?.club_name ?? "", cidade: p?.city ?? "", estado: p?.estado ?? "",
          acompanhantes: d.event_companions ?? [], data: new Date(d.created_at).toLocaleString("pt-BR"),
          desistencia: d.canceled_at ? new Date(d.canceled_at).toLocaleString("pt-BR") : null };
      }));
    })();
  }, [open, eventId]);

  const confirmados = rows.filter((r) => !r.desistencia);
  const desistentes = rows.filter((r) => r.desistencia);
  const clubes = group(confirmados, "clube"), estados = group(confirmados, "estado");
  const totalComp = confirmados.reduce((s, r) => s + r.acompanhantes.length, 0);

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(confirmados.map((r) => ({ Nome: r.nome, "E-mail": r.email, Telefone: r.telefone, Clube: r.clube, Cidade: r.cidade, Estado: r.estado, Acompanhantes: r.acompanhantes.length, "Confirmado em": r.data }))), "Participantes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(confirmados.flatMap((r) => r.acompanhantes.map((a) => ({ Acompanhante: a.name, Idade: a.age, Lions: a.is_lion ? "Sim" : "Não", "Acompanha": r.nome, Clube: r.clube, Estado: r.estado })))), "Acompanhantes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(desistentes.map((r) => ({ Nome: r.nome, "E-mail": r.email, Telefone: r.telefone, Clube: r.clube, Cidade: r.cidade, Estado: r.estado, "Confirmado em": r.data, "Desistiu em": r.desistencia }))), "Desistências");
    const sheet = (g: ReturnType<typeof group>, l: string) => g.map((x) => ({ [l]: x.nome, Participantes: x.participantes, Acompanhantes: x.acompanhantes, "Acompanhantes Lions": x.lions, Total: x.total }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet(clubes, "Clube")), "Por clube");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet(estados, "Estado")), "Por estado");
    XLSX.writeFile(wb, `participantes-${title.replace(/[^\w]+/g, "-")}.xlsx`);
  };

  const exportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const navy: [number, number, number] = [20, 40, 100];
    doc.setFillColor(...navy); doc.rect(0, 0, 210, 24, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.text("Distrito LC-11 · Relatório de participantes", 14, 11);
    doc.setFontSize(10); doc.text(title, 14, 18);
    doc.setTextColor(0, 0, 0); doc.setFontSize(10);
    doc.text(`Participantes: ${confirmados.length}   Acompanhantes: ${totalComp}   Total de pessoas: ${confirmados.length + totalComp}   Desistências: ${desistentes.length}`, 14, 32);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 38);
    const head = { fillColor: navy };
    autoTable(doc, { startY: 44, headStyles: head, styles: { fontSize: 8 },
      head: [["Nome", "Clube", "Cidade/UF", "Contato", "Acomp.", "Confirmado em"]],
      body: confirmados.map((r) => [r.nome, r.clube, [r.cidade, r.estado].filter(Boolean).join(" - "), [r.email, r.telefone].filter(Boolean).join("\n"), r.acompanhantes.length, r.data]) });
    const comp = confirmados.flatMap((r) => r.acompanhantes.map((a) => [a.name, a.age, a.is_lion ? "Sim" : "Não", r.nome, r.clube]));
    const next = () => ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10);
    const section = (t: string, headRow: string[], body: (string | number)[][]) => {
      let y = next(); if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(11); doc.text(t, 14, y);
      autoTable(doc, { startY: y + 3, headStyles: head, styles: { fontSize: 8 }, head: [headRow], body: body.length ? body : [["Sem registros"]] });
    };
    section("Acompanhantes", ["Nome", "Idade", "Lions", "Acompanha", "Clube"], comp);
    section("Desistências", ["Nome", "Clube", "Cidade/UF", "Confirmado em", "Desistiu em"],
      desistentes.map((r) => [r.nome, r.clube, [r.cidade, r.estado].filter(Boolean).join(" - "), r.data, r.desistencia ?? ""]));
    const g = (x: ReturnType<typeof group>) => x.map((v) => [v.nome, v.participantes, v.acompanhantes, v.lions, v.total]);
    section("Por clube", ["Clube", "Participantes", "Acompanhantes", "Lions", "Total"], g(clubes));
    section("Por estado", ["Estado", "Participantes", "Acompanhantes", "Lions", "Total"], g(estados));
    doc.save(`participantes-${title.replace(/[^\w]+/g, "-")}.pdf`);
  };

  const GroupTable = ({ g, label }: { g: ReturnType<typeof group>; label: string }) => (
    <table className="w-full text-sm">
      <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1">{label}</th><th>Participantes</th><th>Acompanhantes</th><th>Lions</th><th>Total</th></tr></thead>
      <tbody>{g.map((x) => <tr key={x.nome} className="border-b"><td className="py-1">{x.nome}</td><td>{x.participantes}</td><td>{x.acompanhantes}</td><td>{x.lions}</td><td className="font-semibold">{x.total}</td></tr>)}</tbody>
    </table>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader><DialogTitle>Relatório de participantes — {title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-4 gap-3">
          {[["Participantes", confirmados.length], ["Acompanhantes", totalComp], ["Total de pessoas", confirmados.length + totalComp], ["Desistências", desistentes.length]].map(([l, v]) => (
            <div key={l as string} className="rounded-lg border bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-bold">{v}</p></div>
          ))}
        </div>
        <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={exportPdf} disabled={!rows.length}><FileText className="mr-1 h-4 w-4" />Exportar PDF</Button><Button size="sm" variant="outline" onClick={exportXlsx} disabled={!rows.length}><FileSpreadsheet className="mr-1 h-4 w-4" />Exportar Excel</Button></div>
        <Tabs defaultValue="users">
          <TabsList><TabsTrigger value="users">Participantes</TabsTrigger><TabsTrigger value="desistencias">Desistências</TabsTrigger><TabsTrigger value="clube">Por clube</TabsTrigger><TabsTrigger value="estado">Por estado</TabsTrigger></TabsList>
          <TabsContent value="users" className="space-y-2">
            {confirmados.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma confirmação ainda.</p>}
            {confirmados.map((r, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{r.nome}</span><span className="text-xs text-muted-foreground">{r.data}</span></div>
                <p className="text-muted-foreground">{[r.clube, [r.cidade, r.estado].filter(Boolean).join(" - "), r.email, r.telefone].filter(Boolean).join(" · ")}</p>
                {r.acompanhantes.length > 0 && (
                  <ul className="mt-2 space-y-0.5 border-l-2 pl-3">
                    {r.acompanhantes.map((a, j) => <li key={j}><Users className="mr-1 inline h-3 w-3" />{a.name}, {a.age} anos{a.is_lion ? " · Lions" : ""}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="desistencias" className="space-y-2">
            {desistentes.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma desistência registrada.</p>}
            {desistentes.map((r, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{r.nome}</span><span className="text-xs font-medium text-destructive">Desistiu em {r.desistencia}</span></div>
                <p className="text-muted-foreground">{[r.clube, [r.cidade, r.estado].filter(Boolean).join(" - "), r.email, r.telefone].filter(Boolean).join(" · ")}</p>
                <p className="text-xs text-muted-foreground">Confirmado em {r.data}</p>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="clube"><GroupTable g={clubes} label="Clube" /></TabsContent>
          <TabsContent value="estado"><GroupTable g={estados} label="Estado" /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
export { BarChart3 };
