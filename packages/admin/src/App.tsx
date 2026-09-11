import {
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  RefreshCw,
  Server,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { platformApi } from "./api";
import type { AdminProfile } from "./data";
import { BillingPage } from "./pages/BillingPage";
import { OverviewPage } from "./pages/OverviewPage";
import { SystemPage } from "./pages/SystemPage";
import { TenantsPage } from "./pages/TenantsPage";
import { UsagePage } from "./pages/UsagePage";
import { UsersPage } from "./pages/UsersPage";
import { usePlatformData } from "./usePlatformData";

type Page = "overview" | "tenants" | "users" | "billing" | "usage" | "system";

interface NavItem {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
}

const nav: readonly NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tenants", label: "Tenants", icon: Building2 },
  { id: "users", label: "Users", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "usage", label: "Usage", icon: BarChart3 },
  { id: "system", label: "System", icon: Server },
];

const pageCopy: Record<Page, { title: string; description: string }> = {
  overview: {
    title: "Overview",
    description:
      "Live tenant, user, room and message totals across the platform.",
  },
  tenants: {
    title: "Tenants",
    description:
      "Create workspaces and manage their plan, status and capacity.",
  },
  users: {
    title: "Users",
    description: "Provision tenant accounts, roles, access and passwords.",
  },
  billing: {
    title: "Billing",
    description:
      "Review plan and trial records currently stored for each tenant.",
  },
  usage: {
    title: "Usage",
    description: "Inspect current capacity and cumulative platform activity.",
  },
  system: {
    title: "System",
    description: "Check the platform API and database connection.",
  },
};

const pageFromHash = (): Page => {
  const candidate = window.location.hash.replace(/^#\/?/, "") as Page;
  return nav.some((item) => item.id === candidate) ? candidate : "overview";
};

const initials = (profile: AdminProfile | null) => {
  const source = profile?.userName || profile?.email || "Platform admin";
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await platformApi.login(
        email.trim().toLowerCase(),
        password,
      );
      localStorage.setItem("accessToken", result.accessToken);
      onAuthenticated();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-shell">
      <form className="panel login-card" onSubmit={submit}>
        <div className="login-brand">
          <span aria-hidden="true">
            <MessageSquareText size={22} />
          </span>
          <div>
            <p className="eyebrow">Platform administration</p>
            <h1>Chat SaaS</h1>
          </div>
        </div>
        <p className="login-description">
          Sign in with a platform owner or platform administrator account.
        </p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary-button login-submit"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export function App() {
  const [authenticated, setAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("accessToken")),
  );
  const [page, setPage] = useState<Page>(pageFromHash);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const data = usePlatformData(authenticated);

  const signOut = useCallback(() => {
    localStorage.removeItem("accessToken");
    setAuthenticated(false);
    setProfile(null);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const unauthorized = () => signOut();
    window.addEventListener("platform:unauthorized", unauthorized);
    return () =>
      window.removeEventListener("platform:unauthorized", unauthorized);
  }, [signOut]);

  useEffect(() => {
    const onHistoryChange = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHistoryChange);
    window.addEventListener("popstate", onHistoryChange);
    return () => {
      window.removeEventListener("hashchange", onHistoryChange);
      window.removeEventListener("popstate", onHistoryChange);
    };
  }, []);

  useEffect(() => {
    document.title = authenticated
      ? `${pageCopy[page].title} · Chat SaaS Admin`
      : "Sign in · Chat SaaS Admin";
  }, [authenticated, page]);

  useEffect(() => {
    if (!authenticated) {
      setProfile(null);
      setProfileError("");
      return;
    }
    let active = true;
    void platformApi
      .getCurrentProfile()
      .then((value) => {
        if (active) {
          setProfile(value);
          setProfileError("");
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setProfileError(
            error instanceof Error ? error.message : "Unable to load profile.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [authenticated]);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    },
    [],
  );

  const notify = useCallback(
    (message: string, tone: "success" | "error" = "success") => {
      setToast({ message, tone });
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
      toastTimer.current = window.setTimeout(() => setToast(null), 4200);
    },
    [],
  );

  const selectPage = (next: Page) => {
    setPage(next);
    setSidebarOpen(false);
    if (window.location.hash !== `#/${next}`) {
      window.history.pushState(null, "", `#/${next}`);
    }
    if (next === "overview" || next === "billing" || next === "usage") {
      void data.loadTenants();
    }
  };

  const refreshTenantData = useCallback(async () => {
    await Promise.allSettled([
      data.loadTenants(),
      data.loadTenantList(),
      data.loadUsers(),
      data.loadOverview(),
    ]);
  }, [
    data.loadOverview,
    data.loadTenantList,
    data.loadTenants,
    data.loadUsers,
  ]);

  const refreshUserData = useCallback(async () => {
    await Promise.allSettled([
      data.loadUsers(),
      data.loadTenants(),
      data.loadOverview(),
    ]);
  }, [data.loadOverview, data.loadTenants, data.loadUsers]);

  const refreshAllAndCurrentPage = useCallback(async () => {
    await data.refreshAll();
    window.dispatchEvent(new Event("platform:refresh-current-page"));
  }, [data.refreshAll]);

  const systemHealthy =
    data.system.data?.status.toLowerCase() === "operational" &&
    !data.system.error;
  const healthLabel = data.system.loading
    ? "Checking systems"
    : systemHealthy
      ? "All systems operational"
      : data.system.error
        ? "System check unavailable"
        : "System status unknown";

  const updatedLabel = useMemo(() => {
    if (!data.lastUpdated) return "Not yet refreshed";
    return `Updated ${new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(data.lastUpdated)}`;
  }, [data.lastUpdated]);

  if (!authenticated) {
    return <LoginScreen onAuthenticated={() => setAuthenticated(true)} />;
  }

  const copy = pageCopy[page];
  const operatorName = profile?.userName || "Platform admin";
  const operatorMeta = profile?.email || profileError || "Loading profile…";

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          type="button"
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <span aria-hidden="true">
            <MessageSquareText size={20} />
          </span>
          <div>
            <strong>Chat SaaS</strong>
            <small>Control center</small>
          </div>
        </div>
        <nav aria-label="Platform administration">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={page === item.id ? "active" : ""}
                aria-current={page === item.id ? "page" : undefined}
                onClick={() => selectPage(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === "tenants" &&
                  data.overview.data?.tenantCount !== undefined && (
                    <em>{data.overview.data.tenantCount}</em>
                  )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="operator">
            <span aria-hidden="true">{initials(profile)}</span>
            <div>
              <strong>{operatorName}</strong>
              <small title={operatorMeta}>{operatorMeta}</small>
            </div>
            <button
              type="button"
              className="operator-logout"
              aria-label="Sign out"
              title="Sign out"
              onClick={signOut}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div className="header-left">
            <button
              type="button"
              className="icon-button mobile-menu"
              aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div>
              <p className="eyebrow">Platform administration</p>
              <h1>{copy.title}</h1>
            </div>
          </div>
          <div className="header-actions">
            <span className="sync-badge">{updatedLabel}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Refresh platform data"
              title="Refresh platform data"
              disabled={data.refreshing}
              onClick={() => void refreshAllAndCurrentPage()}
            >
              <RefreshCw
                className={data.refreshing ? "spin" : undefined}
                size={17}
              />
            </button>
          </div>
        </header>

        <div className="content">
          <div className="page-intro">
            <div>
              <h2>{copy.title}</h2>
              <p>{copy.description}</p>
            </div>
            <span className={`health ${systemHealthy ? "" : "degraded"}`}>
              <i />
              {healthLabel}
            </span>
          </div>

          {page === "overview" && (
            <OverviewPage
              overview={data.overview}
              tenants={data.tenants}
              onRetryOverview={() => void data.loadOverview()}
              onRetryTenants={() => void data.loadTenants()}
              onTenantChanged={refreshTenantData}
              onViewTenants={() => selectPage("tenants")}
              notify={notify}
            />
          )}
          {page === "tenants" && (
            <TenantsPage
              resource={data.tenantList}
              onRetry={() => void data.loadTenantList()}
              onLoad={data.loadTenantList}
              onChanged={refreshTenantData}
              notify={notify}
            />
          )}
          {page === "users" && (
            <UsersPage
              resource={data.users}
              tenants={data.tenants}
              onLoad={data.loadUsers}
              onChanged={refreshUserData}
              notify={notify}
            />
          )}
          {page === "billing" && (
            <BillingPage
              tenants={data.tenants}
              onRetry={() => void data.loadTenants()}
            />
          )}
          {page === "usage" && (
            <UsagePage
              tenants={data.tenants}
              overview={data.overview}
              onRetry={() => void data.refreshAll()}
            />
          )}
          {page === "system" && (
            <SystemPage
              system={data.system}
              onRetry={() => void data.loadSystem()}
            />
          )}
        </div>
      </main>

      {toast && (
        <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
          <span>{toast.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
