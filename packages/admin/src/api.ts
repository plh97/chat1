import type {
  AdminProfile,
  PlatformOverview,
  PlatformSystem,
  PlatformUser,
  PlatformUserRole,
  PlatformUserStatus,
  Tenant,
  TenantPlan,
  TenantStatus,
} from "./data";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/$/,
  "",
);

export const platformApiBase = API_BASE;

interface Envelope<T> {
  code: number;
  message: string;
  data: T;
}

export interface TenantInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  plan: TenantPlan;
  trialDays: number;
  memberLimit?: number;
  storageLimit?: number;
}

export interface TenantUpdateInput {
  name?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  memberLimit?: number;
  storageLimit?: number;
}

export interface TenantUserInput {
  email: string;
  password: string;
  userName?: string;
  role: Extract<PlatformUserRole, "tenant_admin" | "member">;
  joinGeneral: boolean;
}

export interface TenantUserUpdateInput {
  userName?: string;
  role?: Extract<PlatformUserRole, "tenant_owner" | "tenant_admin" | "member">;
  status?: PlatformUserStatus;
  password?: string;
}

export interface ListOptions {
  q?: string;
  status?: string;
  pageSize?: number;
  start?: number;
}

export interface UserListOptions extends ListOptions {
  tenantId?: number;
}

export class PlatformApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PlatformApiError";
    this.status = status;
  }
}

const notifyUnauthorized = () => {
  localStorage.removeItem("accessToken");
  window.dispatchEvent(new CustomEvent("platform:unauthorized"));
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("accessToken") ?? "";
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new PlatformApiError(
      "Unable to reach the platform API. Check the server connection.",
      0,
    );
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    // A proxy or upstream error can return HTML. Preserve a useful message.
  }

  if (!response.ok || body?.code !== 0) {
    if (response.status === 401 || response.status === 403) {
      notifyUnauthorized();
    }
    throw new PlatformApiError(
      body?.message || `Request failed (${response.status})`,
      response.status,
    );
  }

  return body.data;
}

const queryString = (options: ListOptions & { tenantId?: number }): string => {
  const query = new URLSearchParams();
  if (options.q?.trim()) query.set("q", options.q.trim());
  if (options.status && options.status !== "all") {
    query.set("status", options.status);
  }
  if (options.tenantId) query.set("tenantId", String(options.tenantId));
  query.set("pageSize", String(options.pageSize ?? 100));
  query.set("start", String(options.start ?? 0));
  return query.toString();
};

export const platformApi = {
  login: (email: string, password: string) =>
    request<{ accessToken: string }>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getOverview: () => request<PlatformOverview>("/platform/overview"),

  getCurrentProfile: () => request<AdminProfile>("/profile"),

  listTenants: (options: ListOptions = {}) =>
    request<{ tenants: Tenant[]; totalCount: number }>(
      `/platform/tenants?${queryString(options)}`,
    ),

  createTenant: (input: TenantInput) =>
    request<Tenant>("/platform/tenants", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateTenant: (id: number, input: TenantUpdateInput) =>
    request<Tenant>(`/platform/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  archiveTenant: (id: number) =>
    request<{ id: number }>(`/platform/tenants/${id}`, {
      method: "DELETE",
    }),

  listUsers: (options: UserListOptions = {}) =>
    request<{ users: PlatformUser[]; totalCount: number }>(
      `/platform/users?${queryString(options)}`,
    ),

  createTenantUser: (tenantId: number, input: TenantUserInput) =>
    request<PlatformUser>(`/platform/tenants/${tenantId}/users`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateUser: (id: number, input: TenantUserUpdateInput) =>
    request<PlatformUser>(`/platform/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  deleteUser: (id: number) =>
    request<{ id: number }>(`/platform/users/${id}`, {
      method: "DELETE",
    }),

  getSystem: () => request<PlatformSystem>("/platform/system"),
};
