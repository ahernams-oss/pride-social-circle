import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type Associado = {
  id: string;
  full_name: string;
  club_name: string | null;
  avatar_url?: string | null;
};

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function AssociadoCombobox({
  items,
  value,
  onChange,
  placeholder = "Selecionar associado...",
}: {
  items: Associado[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = items.find((a) => a.id === value);
  const filtered = useMemo(() => {
    const nq = normalize(q.trim());
    if (!nq) return items;
    return items.filter(
      (a) => normalize(a.full_name).includes(nq) || normalize(a.club_name ?? "").includes(nq)
    );
  }, [items, q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex gap-1">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span className="flex min-w-0 items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selected.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{selected.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {selected.full_name}
                  {selected.club_name ? <span className="text-muted-foreground"> — {selected.club_name}</span> : null}
                </span>
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} aria-label="Limpar seleção">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou clube..."
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="max-h-64">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum associado encontrado.</p>
          ) : (
            <div className="p-1">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onChange(a.id);
                    setOpen(false);
                    setQ("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                    a.id === value && "bg-accent"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={a.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{a.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.full_name}</span>
                    {a.club_name && <span className="block truncate text-xs text-muted-foreground">{a.club_name}</span>}
                  </span>
                  {a.id === value && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
