import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAdmin } from "@/components/RequireAdmin";
import { AdminUserLevels } from "@/components/AdminUserLevels";
import { AdminMemberRegistry } from "@/components/AdminMemberRegistry";
import { formatCpf, matchProfile, type RegistryEntry } from "@/lib/registry";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, BadgeCheck, ShieldCheck, X } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

type Row = {
  id: string; full_name: string; club_name: string; city: string;
  status: "pending" | "approved" | "rejected"; avatar_url: string | null; created_at: string;
  cpf: string | null; lion_number: string | null; birth_date: string | null;
};

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function AdminPage() {
  return (
    <RequireAdmin>
      <AdminPanel />
    </RequireAdmin>
  );
}

function AdminPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [section, setSection] = useState<"cadastros" | "niveis" | "base">("cadastros");
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());




  const load = useCallback(async () => {
    const [{ data }, { data: reg }] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, club_name, city, status, avatar_url, created_at, cpf, lion_number, birth_date")
        .eq("status", tab).order("created_at", { ascending: false }),
      supabase.from("member_registry").select("full_name, cpf, lion_number, birth_date"),
    ]);
    setRows((data ?? []) as Row[]);
    setRegistry((reg ?? []) as RegistryEntry[]);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const registryMap = useMemo(() => {
    const m = new Map<string, RegistryEntry>();
    registry.forEach((r) => m.set(r.cpf, r));
    return m;
  }, [registry]);

  const setStatus = async (id: string, status: Row["status"]) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    load();
  };

  const verifiedPending = useMemo(
    () => rows.filter((r) => r.status === "pending" && matchProfile(r, registryMap).matched),
    [rows, registryMap],
  );

  // Limpa seleções que não são mais verificadas pendentes
  useEffect(() => {
    const valid = new Set(verifiedPending.map((r) => r.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [verifiedPending]);

  const selectedVerified = useMemo(
    () => verifiedPending.filter((r) => selected.has(r.id)),
    [verifiedPending, selected],
  );

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () => {
    if (selectedVerified.length === verifiedPending.length) setSelected(new Set());
    else setSelected(new Set(verifiedPending.map((r) => r.id)));
  };

  const approveVerified = async () => {
    if (selectedVerified.length === 0) return;
    setBulk(true);
    const reason = `Aprovação em lote — dados conferidos com a base oficial de associados (importação) em ${new Date().toLocaleString("pt-BR")}`;
    let ok = 0;
    const fails: string[] = [];
    for (const r of selectedVerified) {
      const { error } = await supabase.rpc("admin_set_access_level", {
        _user_id: r.id,
        _level: "approved",
        _reason: reason,
      });
      if (error) fails.push(`${r.full_name}: ${error.message}`);
      else ok++;
    }
    setBulk(false);
    if (ok) toast.success(`${ok} cadastro(s) aprovado(s) com auditoria registrada.`);
    if (fails.length) toast.error(`Falhas: ${fails.slice(0, 3).join(" · ")}${fails.length > 3 ? "…" : ""}`);
    load();
  };



  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">Painel administrativo</h1>
      </div>

      <div className="flex flex-wrap gap-2 border-b">
        {([["cadastros", "Cadastros"], ["niveis", "Usuários e níveis"], ["base", "Base de associados"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setSection(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${section === k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "niveis" ? (
        <AdminUserLevels />
      ) : section === "base" ? (
        <AdminMemberRegistry />
      ) : (
      <>
      <div className="flex gap-2 border-b">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {t === "pending" ? "Pendentes" : t === "approved" ? "Aprovados" : "Rejeitados"}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#39FF14] bg-[#39FF14]/10 p-4">
          <BadgeCheck className="h-5 w-5 text-[#2bb80f]" />
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-semibold">Aprovação em lote de verificados</div>
            <div className="text-muted-foreground">
              {verifiedPending.length === 0
                ? "Nenhum cadastro pendente confere com a base oficial no momento."
                : `Marque os cadastros verificados que deseja aprovar (${verifiedPending.length} disponível(is), ${selectedVerified.length} selecionado(s)).`}
            </div>
          </div>
          {verifiedPending.length > 0 && (
            <Button size="sm" variant="outline" onClick={toggleSelectAll}>
              {selectedVerified.length === verifiedPending.length ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
          )}
          <Button
            disabled={bulk || selectedVerified.length === 0}
            onClick={approveVerified}
          >
            <ShieldCheck className="mr-1 h-4 w-4" />
            {bulk ? "Aprovando…" : `Aprovar ${selectedVerified.length} selecionado(s)`}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">

        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-[#39FF14]" /> Dados conferem com a base oficial
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-destructive" /> Divergência com a base oficial
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm border bg-card" /> Não encontrado na base
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-12 text-center text-muted-foreground">Nada por aqui.</p>
      ) : (
        rows.map((r) => {
          const m = matchProfile(r, registryMap);
          const cls = m.matched
            ? "border-[#39FF14] bg-[#39FF14]/15 shadow-[0_0_14px_rgba(57,255,20,0.45)]"
            : m.cpfFound
              ? "border-destructive/60 bg-destructive/5"
              : "";
          return (
          <div key={r.id} className={`flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition ${cls}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={r.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">{initials(r.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                {r.full_name}
                {m.matched ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#39FF14] px-2 py-0.5 text-[11px] font-bold text-black">
                    <BadgeCheck className="h-3 w-3" /> Verificado
                  </span>
                ) : m.cpfFound ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">
                    <AlertTriangle className="h-3 w-3" /> Divergente
                  </span>
                ) : (
                  <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    Fora da base
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{r.club_name || "—"} · {r.city || "—"}</div>
              <div className="text-xs text-muted-foreground">
                CPF {r.cpf ? formatCpf(r.cpf) : "—"} · Lion {r.lion_number || "—"} ·{" "}
                {r.birth_date ? new Date(`${r.birth_date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}
              </div>
              {m.cpfFound && !m.matched && (
                <div className="mt-1 text-xs font-medium text-destructive">
                  {[!m.lionOk && "número Lion não confere", !m.birthOk && "data de nascimento não confere", !m.nameOk && "nome diferente"]
                    .filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
            <Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge>
            <div className="flex gap-2">
              {r.status !== "approved" && (
                <Button size="sm" onClick={() => setStatus(r.id, "approved")}>
                  <ShieldCheck className="mr-1 h-4 w-4" /> Aprovar
                </Button>
              )}
              {r.status !== "rejected" && (
                <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>
                  <X className="mr-1 h-4 w-4" /> Rejeitar
                </Button>
              )}
            </div>
          </div>
          );
        })
      )}
      <p className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
        Dica: importe a planilha oficial em <strong>Base de associados</strong> para que os cadastros conferidos
        apareçam destacados em verde.
      </p>
      </>
      )}

    </div>
  );
}
