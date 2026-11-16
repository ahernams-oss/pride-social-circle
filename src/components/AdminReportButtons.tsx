import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildAdminReport, exportReportExcel, exportReportPdf, type AdminReportSection } from "@/lib/admin-reports";

export function AdminReportButtons({ section }: { section: AdminReportSection }) {
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const run = async (kind: "pdf" | "xlsx") => {
    setBusy(kind);
    try {
      const r = await buildAdminReport(section);
      if (kind === "pdf") await exportReportPdf(r); else exportReportExcel(r);
    } catch (e) {
      toast.error("Não foi possível gerar o relatório", { description: (e as Error).message });
    } finally { setBusy(null); }
  };
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("pdf")}>
        <FileText className="mr-1 h-4 w-4" />{busy === "pdf" ? "Gerando..." : "Relatório PDF"}
      </Button>
      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("xlsx")}>
        <FileSpreadsheet className="mr-1 h-4 w-4" />{busy === "xlsx" ? "Gerando..." : "Relatório Excel"}
      </Button>
    </div>
  );
}
