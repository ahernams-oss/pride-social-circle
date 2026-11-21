import { useQuery } from "@tanstack/react-query";
import { Cake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  anoLeonistico,
  birthdayMessage,
  fetchCurrentGovernor,
} from "@/lib/birthday-message";

/**
 * Cartão de feliz aniversário assinado pelo governador do momento.
 * A assinatura muda automaticamente quando o cargo de Governador do
 * Distrito é atualizado em Admin → Cargos do Distrito.
 */
export function BirthdayMessage({ nome }: { nome: string }) {
  const { data: governor } = useQuery({
    queryKey: ["current-governor-signature"],
    queryFn: fetchCurrentGovernor,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Card className="overflow-hidden border-amber-300 bg-gradient-to-br from-amber-50 via-background to-amber-50 dark:from-amber-950/30 dark:to-amber-950/30">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Cake className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            Mensagem do Governador
          </span>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed sm:text-base">
          {birthdayMessage(nome)}
        </p>
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
