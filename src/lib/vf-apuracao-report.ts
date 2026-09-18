import * as XLSX from "xlsx";

export type ApuracaoCandidato = {
  nome: string;
  numero: string | null;
  fotoUrl: string | null;
  votos: number;
  pct: number;
};

export type ApuracaoCargoReport = {
  cargo: string;
  totalVotos: number;
  candidatos: ApuracaoCandidato[];
  favoraveis: number;
  favoraveisPct: number;
  contrarios: number;
  contrariosPct: number;
  nulos: number;
  nulosPct: number;
};

export type ApuracaoReport = {
  titulo: string;
  descricao: string | null;
  distrito: string | null;
  dataEleicao: string;
  statusLabel: string;
  presidente: string | null;
  geradoEm: string;
  totalGeral: number;
  cargos: ApuracaoCargoReport[];
};

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const fileBase = (d: ApuracaoReport) => `apuracao-${slug(d.titulo) || "eleicao"}`;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const pct = (n: number) => `${n.toFixed(1)}%`;

export const PIE_COLORS = [
  "#0a2d69", "#c8a227", "#2f7d4f", "#8e44ad", "#d35400",
  "#1f78b4", "#b03a2e", "#16a085", "#7f8c8d", "#2c3e50",
];

export type PieSlice = { label: string; value: number; color: string };

export function cargoSlices(c: ApuracaoCargoReport): PieSlice[] {
  const slices: PieSlice[] = c.candidatos.map((k, i) => ({
    label: k.numero ? `${k.nome} (nº ${k.numero})` : k.nome,
    value: k.votos,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
  if (c.favoraveis > 0) slices.push({ label: "Favoráveis (Sim)", value: c.favoraveis, color: "#4caf50" });
  if (c.contrarios > 0) slices.push({ label: "Contrários (Não)", value: c.contrarios, color: "#e53935" });
  if (c.nulos > 0) slices.push({ label: "Nulos", value: c.nulos, color: "#9e9e9e" });
  return slices.filter((s) => s.value > 0);
}

/** Renders a pie chart (with legend) to a PNG data URL using canvas. */
export function renderPieDataUrl(c: ApuracaoCargoReport, width = 520, height = 300): string | null {
  const slices = cargoSlices(c);
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const r = Math.min(height, width / 2) / 2 - 12;
  const cx = r + 20;
  const cy = height / 2;
  let start = -Math.PI / 2;
  for (const s of slices) {
    const angle = (s.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    const mid = start + angle / 2;
    const p = ((s.value / total) * 100).toFixed(1);
    if (angle > 0.25) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${p}%`, cx + Math.cos(mid) * r * 0.62, cy + Math.sin(mid) * r * 0.62);
    }
    start += angle;
  }

  let ly = 24;
  const lx = cx + r + 24;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (const s of slices) {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, ly - 6, 12, 12);
    ctx.fillStyle = "#111111";
    ctx.font = "12px Arial";
    const label = `${s.label} — ${s.value} (${((s.value / total) * 100).toFixed(1)}%)`;
    ctx.fillText(label.length > 44 ? `${label.slice(0, 43)}…` : label, lx + 18, ly);
    ly += 20;
    if (ly > height - 10) break;
  }
  return canvas.toDataURL("image/png");
}


async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise<string | null>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadPhotos(d: ApuracaoReport) {
  const urls = new Set<string>();
  for (const c of d.cargos) for (const k of c.candidatos) if (k.fotoUrl) urls.add(k.fotoUrl);
  const entries = await Promise.all([...urls].map(async (u) => [u, await toDataUrl(u)] as const));
  return new Map(entries.filter(([, v]) => !!v) as [string, string][]);
}

export async function exportApuracaoPdf(d: ApuracaoReport) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const photos = await loadPhotos(d);
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Relatório de Apuração", 14, 18);
  doc.setFontSize(12);
  doc.text(d.titulo, 14, 26);
  doc.setFontSize(9);
  let y = 33;
  const meta = [
    d.distrito ? `Distrito: ${d.distrito}` : null,
    `Data da eleição: ${d.dataEleicao}`,
    `Situação: ${d.statusLabel}`,
    `Total de votos apurados: ${d.totalGeral}`,
    `Emitido em: ${d.geradoEm}`,
  ].filter(Boolean) as string[];
  if (d.descricao) meta.unshift(d.descricao);
  for (const line of meta) {
    doc.text(line, 14, y);
    y += 5;
  }
  y += 3;

  for (const c of d.cargos) {
    doc.setFontSize(11);
    doc.text(`${c.cargo} — ${c.totalVotos} voto(s)`, 14, y);
    y += 2;
    const body = c.candidatos.map((k) => [
      "",
      k.numero ? `${k.nome} (nº ${k.numero})` : k.nome,
      String(k.votos),
      pct(k.pct),
    ]);
    const rowPhoto = c.candidatos.map((k) => (k.fotoUrl ? photos.get(k.fotoUrl) ?? null : null));
    autoTable(doc, {
      startY: y + 2,
      head: [["Foto", "Candidato", "Votos recebidos", "%"]],
      body,
      styles: { fontSize: 9, minCellHeight: 16, valign: "middle" },
      headStyles: { fillColor: [10, 45, 105] },
      columnStyles: { 0: { cellWidth: 20 }, 2: { halign: "right" }, 3: { halign: "right" } },
      didDrawCell: (data) => {
        if (data.section !== "body" || data.column.index !== 0) return;
        const img = rowPhoto[data.row.index];
        if (!img) return;
        try {
          doc.addImage(img, data.cell.x + 4, data.cell.y + 2, 12, 12);
        } catch {
          /* ignore unsupported image */
        }
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    autoTable(doc, {
      startY: y,
      head: [["Resumo", "Votos", "%"]],
      body: [
        ["Votos favoráveis (Sim)", String(c.favoraveis), pct(c.favoraveisPct)],
        ["Votos contrários (Não)", String(c.contrarios), pct(c.contrariosPct)],
        ["Votos nulos", String(c.nulos), pct(c.nulosPct)],
        ["Total de votos", String(c.totalVotos), "100,0%"],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [120, 120, 120] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  }

  if (d.presidente) {
    doc.setFontSize(9);
    doc.text("_________________________________", 14, y + 10);
    doc.text(`${d.presidente} — Presidente da Comissão Eleitoral`, 14, y + 15);
  }

  doc.save(`${fileBase(d)}.pdf`);
}

export async function exportApuracaoWord(d: ApuracaoReport) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const photos = await loadPhotos(d);
  const img = (url: string | null) => {
    const src = url ? photos.get(url) ?? url : null;
    return src
      ? `<img src="${esc(src)}" width="56" height="56" style="width:56px;height:56px;object-fit:cover" />`
      : "—";
  };

  const cargos = d.cargos
    .map(
      (c) => `
    <h3>${esc(c.cargo)} — ${c.totalVotos} voto(s)</h3>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">
      <tr><th align="left">Foto</th><th align="left">Candidato</th><th align="right">Votos recebidos</th><th align="right">%</th></tr>
      ${c.candidatos
        .map(
          (k) =>
            `<tr><td>${img(k.fotoUrl)}</td><td>${esc(k.nome)}${k.numero ? ` (nº ${esc(k.numero)})` : ""}</td><td align="right">${k.votos}</td><td align="right">${pct(k.pct)}</td></tr>`,
        )
        .join("")}
    </table>
    <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;margin-top:8px">
      <tr><th align="left">Resumo</th><th align="right">Votos</th><th align="right">%</th></tr>
      <tr><td>Votos favoráveis (Sim)</td><td align="right">${c.favoraveis}</td><td align="right">${pct(c.favoraveisPct)}</td></tr>
      <tr><td>Votos contrários (Não)</td><td align="right">${c.contrarios}</td><td align="right">${pct(c.contrariosPct)}</td></tr>
      <tr><td>Votos nulos</td><td align="right">${c.nulos}</td><td align="right">${pct(c.nulosPct)}</td></tr>
      <tr><td><strong>Total de votos</strong></td><td align="right"><strong>${c.totalVotos}</strong></td><td align="right">100,0%</td></tr>
    </table>`,
    )
    .join("");

  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif">
    <h1>Relatório de Apuração</h1>
    <h2>${esc(d.titulo)}</h2>
    ${d.descricao ? `<p>${esc(d.descricao)}</p>` : ""}
    <p>${d.distrito ? `<strong>Distrito:</strong> ${esc(d.distrito)}<br/>` : ""}
    <strong>Data da eleição:</strong> ${esc(d.dataEleicao)}<br/>
    <strong>Situação:</strong> ${esc(d.statusLabel)}<br/>
    <strong>Total de votos apurados:</strong> ${d.totalGeral}<br/>
    <strong>Emitido em:</strong> ${esc(d.geradoEm)}</p>
    ${cargos}
    ${d.presidente ? `<p style="margin-top:40px">_________________________________<br/>${esc(d.presidente)} — Presidente da Comissão Eleitoral</p>` : ""}
  </body></html>`;
  download(new Blob([html], { type: "application/msword" }), `${fileBase(d)}.doc`);
}

export function exportApuracaoExcel(d: ApuracaoReport) {
  const rows: (string | number)[][] = [
    ["Relatório de Apuração"],
    [d.titulo],
    ...(d.descricao ? [[d.descricao]] : []),
    ...(d.distrito ? [["Distrito", d.distrito]] : []),
    ["Data da eleição", d.dataEleicao],
    ["Situação", d.statusLabel],
    ["Total de votos apurados", d.totalGeral],
    ["Emitido em", d.geradoEm],
    [],
  ];
  for (const c of d.cargos) {
    rows.push([c.cargo, "", "", "", ""]);
    rows.push(["Candidato", "Número", "Votos recebidos", "% do cargo", "Foto (link)"]);
    for (const k of c.candidatos) {
      rows.push([k.nome, k.numero ?? "", k.votos, Number(k.pct.toFixed(1)), k.fotoUrl ?? ""]);
    }
    rows.push(["Votos favoráveis (Sim)", "", c.favoraveis, Number(c.favoraveisPct.toFixed(1)), ""]);
    rows.push(["Votos contrários (Não)", "", c.contrarios, Number(c.contrariosPct.toFixed(1)), ""]);
    rows.push(["Votos nulos", "", c.nulos, Number(c.nulosPct.toFixed(1)), ""]);
    rows.push(["Total de votos", "", c.totalVotos, 100, ""]);
    rows.push([]);
  }
  if (d.presidente) rows.push([`${d.presidente} — Presidente da Comissão Eleitoral`]);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 38 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 46 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Apuração");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(
    new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${fileBase(d)}.xlsx`,
  );
}
