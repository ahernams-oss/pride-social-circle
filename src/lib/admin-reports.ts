import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

export type AdminReportSection = "dashboard" | "cadastros" | "niveis" | "permissoes" | "base" | "laurear";
export type ReportSheet = { name: string; columns: string[]; rows: (string | number)[][] };
export type Report = { title: string; sheets: ReportSheet[] };

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "");
const fmtDay = (d?: string | null) => (d ? new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR") : "");
const STATUS: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Rejeitado" };

async function profiles() {
  const { data } = await supabase.from("profiles")
    .select("id, full_name, club_name, city, estado, email, phone, status, is_active, access_level, created_at, cpf, lion_number, birth_date")
    .order("full_name");
  return data ?? [];
}

export async function buildAdminReport(section: AdminReportSection): Promise<Report> {
  if (section === "dashboard") {
    const ps = await profiles();
    const count = (f: (p: any) => boolean) => ps.filter(f).length;
    const clubs = new Map<string, number>();
    ps.forEach((p) => clubs.set(p.club_name || "Sem clube", (clubs.get(p.club_name || "Sem clube") ?? 0) + 1));
    const levels = new Map<string, number>();
    ps.forEach((p) => levels.set(p.access_level || "—", (levels.get(p.access_level || "—") ?? 0) + 1));
    const [posts, events, missions] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }),
      supabase.from("events").select("id", { count: "exact", head: true }),
      supabase.from("missions").select("id", { count: "exact", head: true }),
    ]);
    return {
      title: "Dashboard administrativo",
      sheets: [
        { name: "Resumo", columns: ["Indicador", "Total"], rows: [
          ["Membros", ps.length], ["Aprovados", count((p) => p.status === "approved")],
          ["Pendentes", count((p) => p.status === "pending")], ["Rejeitados", count((p) => p.status === "rejected")],
          ["Inativos", count((p) => !p.is_active)], ["Publicações", posts.count ?? 0],
          ["Eventos", events.count ?? 0], ["Missões", missions.count ?? 0],
        ] },
        { name: "Por clube", columns: ["Clube", "Associados", "%"], rows: [...clubs].sort((a, b) => b[1] - a[1])
          .map(([c, n]) => [c, n, ps.length ? `${((n / ps.length) * 100).toFixed(1)}%` : "0%"]) },
        { name: "Por nível", columns: ["Nível", "Usuários"], rows: [...levels] },
      ],
    };
  }
  if (section === "cadastros") {
    const ps = await profiles();
    return { title: "Cadastros", sheets: [{ name: "Cadastros",
      columns: ["Nome", "Clube", "Cidade", "Estado", "E-mail", "Telefone", "Status", "Cadastro em"],
      rows: ps.map((p) => [p.full_name, p.club_name, p.city, p.estado, p.email ?? "", p.phone ?? "", STATUS[p.status] ?? p.status, fmtDate(p.created_at)]) }] };
  }
  if (section === "niveis") {
    const ps = await profiles();
    const { data: audit } = await supabase.from("access_level_audit").select("*").order("created_at", { ascending: false });
    const name = new Map(ps.map((p) => [p.id, p.full_name]));
    return { title: "Usuários e níveis", sheets: [
      { name: "Usuários", columns: ["Nome", "Clube", "Cidade", "Nível", "Situação"],
        rows: ps.map((p) => [p.full_name, p.club_name, p.city, p.access_level ?? "", p.is_active ? "Ativo" : "Inativo"]) },
      { name: "Auditoria", columns: ["Usuário", "De", "Para", "Por", "Motivo", "Data"],
        rows: (audit ?? []).map((a) => [name.get(a.target_user_id) ?? "", a.old_level, a.new_level, name.get(a.changed_by ?? "") ?? "", a.reason ?? "", fmtDate(a.created_at)]) },
    ] };
  }
  if (section === "permissoes") {
    const [{ data: lv }, { data: perms }] = await Promise.all([
      supabase.from("access_levels").select("*").order("rank"),
      supabase.from("access_level_permissions").select("*").order("level_key"),
    ]);
    const label = new Map((lv ?? []).map((l) => [l.key, l.label]));
    const yn = (b: boolean) => (b ? "Sim" : "Não");
    return { title: "Níveis e permissões", sheets: [
      { name: "Níveis", columns: ["Nível", "Base", "Descrição"], rows: (lv ?? []).map((l) => [l.label, l.base_level, l.description]) },
      { name: "Permissões", columns: ["Nível", "Menu", "Ver", "Criar", "Editar", "Excluir", "Aprovar"],
        rows: (perms ?? []).map((p) => [label.get(p.level_key) ?? p.level_key, p.menu_key, yn(p.can_view), yn(p.can_create), yn(p.can_edit), yn(p.can_delete), yn(p.can_approve)]) },
    ] };
  }
  if (section === "base") {
    const { data } = await supabase.from("member_registry").select("*").order("full_name");
    return { title: "Base de associados", sheets: [{ name: "Base", columns: ["Nome", "CPF", "Número Lion", "Nascimento"],
      rows: (data ?? []).map((r) => [r.full_name, r.cpf, r.lion_number, fmtDay(r.birth_date)]) }] };
  }
  const [{ data }, ps] = await Promise.all([
    supabase.from("member_lions_awards").select("*").order("awarded_on", { ascending: false }), profiles(),
  ]);
  const name = new Map(ps.map((p) => [p.id, p.full_name]));
  const CAT: Record<string, string> = { curso: "Curso", certificado: "Certificado", titulo: "Título do Lions" };
  return { title: "Laurear companheiros", sheets: [{ name: "Concessões",
    columns: ["Companheiro", "Categoria", "Título", "Instituição", "Data", "Concedido por"],
    rows: (data ?? []).map((a) => [name.get(a.user_id) ?? "", CAT[a.category] ?? a.category, a.title, a.institution, fmtDay(a.awarded_on), name.get(a.granted_by) ?? ""]) }] };
}

const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
const stamp = () => new Date().toISOString().slice(0, 10);

export function exportReportExcel(r: Report) {
  const wb = XLSX.utils.book_new();
  r.sheets.forEach((s) => {
    const ws = XLSX.utils.aoa_to_sheet([s.columns, ...s.rows]);
    ws["!cols"] = s.columns.map((c, i) => ({ wch: Math.min(50, Math.max(c.length, ...s.rows.map((row) => String(row[i] ?? "").length)) + 2) }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  XLSX.writeFile(wb, `${slug(r.title)}-${stamp()}.xlsx`);
}

export async function exportReportPdf(r: Report) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16); doc.text(`Lions Connecta — ${r.title}`, 14, 16);
  doc.setFontSize(9); doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
  let y = 28;
  r.sheets.forEach((s) => {
    if (y > 180) { doc.addPage(); y = 16; }
    doc.setFontSize(12); doc.text(s.name, 14, y);
    autoTable(doc, { startY: y + 3, head: [s.columns], body: s.rows.map((row) => row.map(String)),
      styles: { fontSize: 8 }, headStyles: { fillColor: [16, 42, 107] } });
    y = (doc as any).lastAutoTable.finalY + 10;
  });
  doc.save(`${slug(r.title)}-${stamp()}.pdf`);
}
