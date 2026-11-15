export function canGrantAward(isAdmin: boolean, canView: boolean, canCreate: boolean): boolean {
  return isAdmin || (canView && canCreate);
}