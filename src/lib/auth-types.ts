// Shared auth types and helpers — safe for client-side imports.
// No server-only modules (cookies, bcrypt) are imported here.

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  colorTheme: string;
  darkMode: boolean;
  advancedAccounts: boolean;
  permissions: Record<string, boolean>;
  columnOrder?: string;
  pageSize?: number;
  reportColumns?: string;
  reportColumnOrder?: string;
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.role === "Super Admin";
}

export function hasPermission(user: AuthUser | null, perm: string): boolean {
  if (!user) return false;
  if (user.role === "Super Admin") return true;
  return !!user.permissions?.[perm];
}
