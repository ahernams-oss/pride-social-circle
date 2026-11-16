export const EDIT_WINDOW_MS = 3 * 60 * 1000;
export function canEditPost(createdAt: string, now: number = Date.now()): boolean {
  return now - new Date(createdAt).getTime() < EDIT_WINDOW_MS;
}
