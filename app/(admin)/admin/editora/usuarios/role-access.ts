import type { UserRole } from "@/types/database";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin_editora: "Admin Editora",
  admin_ead: "Admin EAD",
  admin_eifol: "Admin EIFOL",
  afiliado_jocum: "Afiliado JOCUM",
  afiliado_diretor: "Afiliado Diretor",
  lider_jocum: "Líder JOCUM",
  cliente: "Cliente",
};

export const ROLE_LEVEL: Record<UserRole, number> = {
  super_admin: 100,
  admin_editora: 70,
  admin_ead: 70,
  admin_eifol: 70,
  lider_jocum: 50,
  afiliado_diretor: 40,
  afiliado_jocum: 30,
  cliente: 10,
};

export const EDITORA_ASSIGNABLE_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "cliente", label: ROLE_LABELS.cliente },
  { value: "admin_editora", label: ROLE_LABELS.admin_editora },
  { value: "lider_jocum", label: ROLE_LABELS.lider_jocum },
  { value: "afiliado_diretor", label: ROLE_LABELS.afiliado_diretor },
  { value: "afiliado_jocum", label: ROLE_LABELS.afiliado_jocum },
];

export const SUPER_ADMIN_ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: "cliente", label: ROLE_LABELS.cliente },
  { value: "super_admin", label: ROLE_LABELS.super_admin },
  { value: "admin_editora", label: ROLE_LABELS.admin_editora },
  { value: "admin_ead", label: ROLE_LABELS.admin_ead },
  { value: "admin_eifol", label: ROLE_LABELS.admin_eifol },
  { value: "lider_jocum", label: ROLE_LABELS.lider_jocum },
  { value: "afiliado_diretor", label: ROLE_LABELS.afiliado_diretor },
  { value: "afiliado_jocum", label: ROLE_LABELS.afiliado_jocum },
];

const EDITORA_ASSIGNABLE_ROLES = new Set(
  EDITORA_ASSIGNABLE_ROLE_OPTIONS.map((role) => role.value)
);

export type UsersAdminRole = "super_admin" | "admin_editora";

export function isKnownRole(role: string | null | undefined): role is UserRole {
  return typeof role === "string" && role in ROLE_LEVEL;
}

export function canAccessUsersFlow(role: UserRole | null | undefined): role is UsersAdminRole {
  return role === "super_admin" || role === "admin_editora";
}

export function getViewerRoleLevel(role: string | null | undefined) {
  if (!role) return 0;
  return isKnownRole(role) ? ROLE_LEVEL[role] : 0;
}

export function getTargetRoleLevel(role: string | null | undefined) {
  if (!role) return ROLE_LEVEL.cliente;
  return isKnownRole(role) ? ROLE_LEVEL[role] : Number.POSITIVE_INFINITY;
}

export function canViewRole(
  viewerRole: string | null | undefined,
  targetRole: string | null | undefined
) {
  return getTargetRoleLevel(targetRole) <= getViewerRoleLevel(viewerRole);
}

export function canEditRole(
  viewerRole: string | null | undefined,
  targetRole: string | null | undefined
) {
  return getTargetRoleLevel(targetRole) < getViewerRoleLevel(viewerRole);
}

export function canAssignRoleInUsersFlow(
  viewerRole: UsersAdminRole,
  targetRole: UserRole
) {
  if (viewerRole === "super_admin") return true;
  return (
    EDITORA_ASSIGNABLE_ROLES.has(targetRole) &&
    getTargetRoleLevel(targetRole) <= getViewerRoleLevel(viewerRole)
  );
}

export function getAssignableRoleOptions(isSuperAdmin: boolean) {
  return isSuperAdmin ? SUPER_ADMIN_ROLE_OPTIONS : EDITORA_ASSIGNABLE_ROLE_OPTIONS;
}
