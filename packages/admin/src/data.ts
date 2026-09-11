export type TenantStatus = "active" | "trial" | "suspended" | "archived";

export type TenantPlan = "starter" | "pro" | "business";

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  ownerUserId: number;
  ownerEmail: string;
  memberLimit: number;
  storageLimit: number;
  memberCount: number;
  roomCount: number;
  messageCount: number;
  trialEndsAt?: string | null;
  createdAt: string;
}

export interface PlatformOverview {
  tenantCount: number;
  activeTenants: number;
  userCount: number;
  roomCount: number;
  messageCount: number;
}

export type PlatformUserRole =
  | "platform_owner"
  | "platform_admin"
  | "tenant_owner"
  | "tenant_admin"
  | "user"
  | "member";

export type PlatformUserStatus = "active" | "suspended";

export interface PlatformUser {
  id: number;
  tenantId: number;
  tenantName: string;
  userName: string;
  email: string;
  role: PlatformUserRole;
  status: PlatformUserStatus;
  createdAt: string;
}

export interface PlatformSystem {
  database: string;
  status: string;
  checkedAt: string;
}

export interface AdminProfile {
  id: string;
  userId: string;
  userName: string;
  email: string;
  permission: string;
  image?: string;
}

export const formatCount = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);

export const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatBytes = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const amount = value / 1024 ** index;
  return `${amount.toFixed(amount >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export const tenantPlanLabel = (plan: TenantPlan): string =>
  plan.charAt(0).toUpperCase() + plan.slice(1);

export const userRoleLabel = (role: PlatformUserRole): string =>
  role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
