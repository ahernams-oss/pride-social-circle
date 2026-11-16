export type PollStatus = "rascunho" | "agendada" | "aberta" | "encerrada";

export function pollStatus(startsAt: string, endsAt: string, now: Date = new Date(), publishedAt: string | null = "x"): PollStatus {
  if (!publishedAt) return "rascunho";
  const t = now.getTime();
  if (t < new Date(startsAt).getTime()) return "agendada";
  if (t > new Date(endsAt).getTime()) return "encerrada";
  return "aberta";
}

export function validPollPeriod(startsAt: string, endsAt: string): boolean {
  if (!startsAt || !endsAt) return false;
  return new Date(endsAt).getTime() > new Date(startsAt).getTime();
}

/** Só rascunhos podem ser editados; publicada só pode ser finalizada se ainda não encerrou. */
export const canEditPoll = (status: PollStatus) => status === "rascunho";
export const canFinishPoll = (status: PollStatus) => status === "aberta" || status === "agendada";
