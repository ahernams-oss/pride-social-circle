export function canGrantAward(isAdmin: boolean, canView: boolean, canCreate: boolean): boolean {
  return isAdmin || (canView && canCreate);
}

export function canEditAward(isAdmin: boolean, canView: boolean, canEdit: boolean): boolean {
  return isAdmin || (canView && canEdit);
}