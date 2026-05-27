import { createFileRoute, Navigate, useNavigate, useHydrated } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/pending")({ component: Pending });

function Pending() {
  const hydrated = useHydrated();
  const { user, profile, signOut, loading, refresh } = useAuth();
  const nav = useNavigate();
  if (!hydrated || loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (profile?.status === "approved") return <Navigate to="/feed" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-lions-gradient p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-card-foreground">
          {profile?.status === "rejected" ? "Cadastro não aprovado" : "Aguardando aprovação"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {profile?.status === "rejected"
            ? "Entre em contato com a administração do seu clube."
            : "Um administrador irá revisar seu cadastro em breve. Você receberá uma notificação quando for aprovado."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => refresh()} variant="outline">Atualizar status</Button>
          <Button onClick={async () => { await signOut(); nav({ to: "/" }); }} variant="ghost">
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
