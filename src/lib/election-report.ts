import * as XLSX from "xlsx";

export type ReportSection = {
  name: string;
  rows: { label: string; votes: number; pct: number }[];
};

export type ReportData = {
  title: string;
  description: string | null;
  typeLabel: string;
  statusLabel: string;
  totalBallots: number;
  generatedAt: string;
  sections: ReportSection[];
};

const fileBase = (d: ReportData) =>
  `relatorio-${d.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPdf(d: ReportData) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(d.title, 14, 18);
  doc.setFontSize(10);
  let y = 25;
  const meta = [
    `Tipo: ${d.typeLabel}`,
    `Situação: ${d.statusLabel}`,
    `Total de votos registrados: ${d.totalBallots}`,
    `Emitido em: ${d.generatedAt}`,
  ];
  if (d.description) meta.unshift(d.description);
  for (const line of meta) {
    doc.text(line, 14, y);
    y += 5;
  }
  y += 3;
  for (const s of d.sections) {
    autoTable(doc, {
      startY: y,
      head: [[s.name || "Resultado", "Votos", "%"]],
      body: s.rows.map((r) => [r.label, String(r.votes), `${r.pct.toFixed(1)}%`]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [10, 45, 105] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }
  doc.save(`${fileBase(d)}.pdf`);
}

export function exportWord(d: ReportData) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const sections = d.sections
    .map(
      (s) => `
    <h3>${esc(s.name || "Resultado")}</h3>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
      <tr><th align="left">Opção</th><th align="right">Votos</th><th align="right">%</th></tr>
      ${s.rows.map((r) => `<tr><td>${esc(r.label)}</td><td align="right">${r.votes}</td><td align="right">${r.pct.toFixed(1)}%</td></tr>`).join("")}
    </table>`,
    )
    .join("");
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif">
    <h1>${esc(d.title)}</h1>
    ${d.description ? `<p>${esc(d.description)}</p>` : ""}
    <p><strong>Tipo:</strong> ${esc(d.typeLabel)}<br/>
    <strong>Situação:</strong> ${esc(d.statusLabel)}<br/>
    <strong>Total de votos registrados:</strong> ${d.totalBallots}<br/>
    <strong>Emitido em:</strong> ${esc(d.generatedAt)}</p>
    ${sections}
  </body></html>`;
  download(new Blob([html], { type: "application/msword" }), `${fileBase(d)}.doc`);
}

export function exportExcel(d: ReportData) {
  const rows: (string | number)[][] = [
    [d.title],
    ...(d.description ? [[d.description]] : []),
    ["Tipo", d.typeLabel],
    ["Situação", d.statusLabel],
    ["Total de votos registrados", d.totalBallots],
    ["Emitido em", d.generatedAt],
    [],
  ];
  for (const s of d.sections) {
    rows.push([s.name || "Resultado", "Votos", "%"]);
    for (const r of s.rows) rows.push([r.label, r.votes, Number(r.pct.toFixed(1))]);
    rows.push([]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 42 }, { wch: 12 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Resultado");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${fileBase(d)}.xlsx`);
}
