export enum Role {
  Admin,
  Editor,
  Viewer,
}

export function canEdit(role: Role): boolean {
  return role === Role.Admin || role === Role.Editor;
}
