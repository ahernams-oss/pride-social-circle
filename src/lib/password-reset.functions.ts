import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_RESET_ATTEMPTS, resetAnswersMatch } from "./password-reset";

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Apenas administradores podem zerar senhas");
    if (data.userId === context.userId) throw new Error("Você não pode zerar a sua própria senha");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error: ue } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (ue || !u.user?.email) throw new Error("Usuário não encontrado");

    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const randomPwd = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { error: pe } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: randomPwd });
    if (pe) throw new Error(pe.message);

    const { error: ie } = await supabaseAdmin.from("password_resets").upsert({
      user_id: data.userId, email: u.user.email.toLowerCase(), reset_by: context.userId, attempts: 0, created_at: new Date().toISOString(),
    });
    if (ie) throw new Error(ie.message);
    return { ok: true };
  });

export const checkPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("password_resets")
      .select("user_id").eq("email", data.email.toLowerCase().trim()).maybeSingle();
    return { required: !!row };
  });

export const completePasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    email: z.string().email(),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    club_name: z.string().min(1).max(200),
    new_password: z.string().min(6).max(72),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("password_resets")
      .select("user_id, attempts").eq("email", data.email.toLowerCase().trim()).maybeSingle();
    if (!row) throw new Error("Não há redefinição de senha pendente para este e-mail.");
    if (row.attempts >= MAX_RESET_ATTEMPTS) {
      throw new Error("Muitas tentativas incorretas. Peça a um administrador para zerar a senha novamente.");
    }
    const { data: prof } = await supabaseAdmin.from("profiles")
      .select("birth_date, club_name").eq("id", row.user_id).maybeSingle();
    if (!prof || !resetAnswersMatch(prof, data)) {
      const attempts = row.attempts + 1;
      await supabaseAdmin.from("password_resets").update({ attempts }).eq("user_id", row.user_id);
      const left = MAX_RESET_ATTEMPTS - attempts;
      throw new Error(left > 0
        ? `Data de nascimento ou clube não conferem. Restam ${left} tentativa(s).`
        : "Muitas tentativas incorretas. Peça a um administrador para zerar a senha novamente.");
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, { password: data.new_password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("password_resets").delete().eq("user_id", row.user_id);
    return { ok: true };
  });
