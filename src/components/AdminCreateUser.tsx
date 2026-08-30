import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminCreateUser } from "@/lib/admin-users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { LEVEL_DESCRIPTION, LEVEL_LABEL, type AccessLevel } from "@/lib/permissions";

type Level = Extract<AccessLevel, "user" | "approved" | "moderator" | "admin">;
const LEVELS: Level[] = ["user", "approved", "moderator", "admin"];

const empty = {
  full_name: "", email: "", password: "", club_name: "", city: "",
  phone: "", cpf: "", lion_number: "",
};

export function AdminCreateUser({ onCreated }: { onCreated?: () => void }) {
  const create = useServerFn(adminCreateUser);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [level, setLevel] = useState<Level>("approved");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.full_name || !form.email || form.password.length < 6) {
      toast.error("Informe nome, e-mail e uma senha com pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    try {
      await create({ data: { ...form, level } });
      toast.success("Usuário criado com sucesso");
      setForm(empty);
      setLevel("approved");
      setOpen(false);
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar usuário");
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof typeof empty, label: string, type = "text") => (
    <div className="space-y-1">
      <Label htmlFor={`cu-${k}`}>{label}</Label>
      <Input
        id={`cu-${k}`}
        type={type}
        value={form[k]}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" /> Criar usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar perfil de usuário</DialogTitle>
          <DialogDescription>
            O acesso é criado já confirmado, com o nível de permissão escolhido.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {field("full_name", "Nome completo *")}
          {field("email", "E-mail *", "email")}
          {field("password", "Senha provisória *", "password")}
          {field("phone", "Telefone celular")}
          {field("cpf", "CPF")}
          {field("lion_number", "Número Lion")}
          {field("club_name", "Clube")}
          {field("city", "Cidade")}
        </div>

        <div className="space-y-1">
          <Label>Nível de acesso</Label>
          <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{LEVEL_DESCRIPTION[level]}</p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Criando..." : "Criar usuário"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
