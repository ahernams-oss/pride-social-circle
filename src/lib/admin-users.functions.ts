import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(3),
  club_name: z.string().default(""),
  city: z.string().default(""),
  phone: z.string().default(""),
  cpf: z.string().default(""),
  lion_number: z.string().default(""),
  level: z.enum(["user", "approved", "moderator", "admin"]),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    // Somente administradores podem criar contas com nível definido
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Apenas administradores podem criar usuários");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        club_name: data.club_name,
        city: data.city,
        cpf: data.cpf,
        lion_number: data.lion_number,
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");

    const uid = created.user.id;

    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        club_name: data.club_name,
        city: data.city,
        phone: data.phone,
        email: data.email,
        cpf: data.cpf.replace(/\D/g, ""),
        lion_number: data.lion_number.replace(/\D/g, ""),
      })
      .eq("id", uid);

    // Aplica o nível escolhido usando a função auditada (executa como o admin logado)
    const { error: lvlError } = await context.supabase.rpc("admin_set_access_level", {
      _user_id: uid,
      _level: data.level,
      _reason: "Usuário criado pelo administrador",
    });
    if (lvlError) throw new Error(lvlError.message);

    return { id: uid, email: data.email, level: data.level };
  });
