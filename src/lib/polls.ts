export type PollStatus = "agendada" | "aberta" | "encerrada";

export function pollStatus(startsAt: string, endsAt: string, now: Date = new Date()): PollStatus {
  const t = now.getTime();
  if (t < new Date(startsAt).getTime()) return "agendada";
  if (t > new Date(endsAt).getTime()) return "encerrada";
  return "aberta";
}

export function validPollPeriod(startsAt: string, endsAt: string): boolean {
  if (!startsAt || !endsAt) return false;
  return new Date(endsAt).getTime() > new Date(startsAt).getTime();
}
