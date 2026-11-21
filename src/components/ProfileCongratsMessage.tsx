import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { anoLeonistico, fetchCurrentGovernor, profileCongratsMessage } from "@/lib/birthday-message";

/** Cartão do governador parabenizando o perfil acima de 80%. Pode ser dispensado. */
export function ProfileCongratsMessage({ nome, userId }: { nome: string; userId: string }) {
  const key = `profile-congrats-dismissed:${userId}`;
  const [hidden, setHidden] = useState(true);
  useEffect(() => { setHidden(localStorage.getItem(key) === "1"); }, [key]);
  const { data: governor } = useQuery({
    queryKey: ["current-governor-signature"],
    queryFn: fetchCurrentGovernor,
    staleTime: 5 * 60 * 1000,
  });
  if (hidden) return null;
  return (
    <Card className="relative overflow-hidden border-amber-300 bg-gradient-to-br from-amber-50 via-background to-amber-50 dark:from-amber-950/30 dark:to-amber-950/30">
      <Button
        variant="ghost" size="icon" aria-label="Fechar mensagem"
        className="absolute right-2 top-2"
        onClick={() => { localStorage.setItem(key, "1"); setHidden(true); }}
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Award className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">Mensagem do Governador</span>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed sm:text-base">{profileCongratsMessage(nome)}</p>
        <div className="border-t border-amber-200 pt-3 text-sm dark:border-amber-900">
          <p className="font-semibold">{governor?.signedName ?? "Governador do Distrito"}</p>
          <p className="text-muted-foreground">Governador do Distrito LC-11</p>
          <p className="text-muted-foreground">Ano Leonístico {anoLeonistico()}</p>
          <p className="text-muted-foreground">Lions Clubs International – Nós Servimos!</p>
        </div>
      </CardContent>
    </Card>
  );
}
