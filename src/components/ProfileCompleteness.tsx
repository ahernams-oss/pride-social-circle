import { Link } from "@tanstack/react-router";
import { completeness, type CompletenessProfile } from "@/lib/profile-completeness";

export function ProfileCompleteness({
  profile,
  userId,
  compact = false,
}: {
  profile: CompletenessProfile | null | undefined;
  userId: string;
  compact?: boolean;
}) {
  const { percent, done, total, missing } = completeness(profile);
  if (percent >= 100) return null;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between text-xs font-medium">
        <span>Perfil {percent}% completo</span>
        <span className="text-muted-foreground">
          {done}/{total}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {!compact && missing.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Falta preencher: {missing.slice(0, 4).map((m) => m.label).join(", ")}
          {missing.length > 4 ? ` e mais ${missing.length - 4}` : ""}.
        </p>
      )}
      <Link
        to="/profile/$id"
        params={{ id: userId }}
        className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
      >
        Completar perfil
      </Link>
    </div>
  );
}
