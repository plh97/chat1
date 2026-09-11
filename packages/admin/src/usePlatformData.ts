import { useCallback, useEffect, useState } from "react";
import { platformApi, type ListOptions, type UserListOptions } from "./api";
import type {
  AdminProfile,
  PlatformOverview,
  PlatformSystem,
  PlatformUser,
  Tenant,
} from "./data";

export interface Resource<T> {
  data: T;
  loading: boolean;
  error: string;
  totalCount?: number;
}

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function usePlatformData(enabled: boolean) {
  // Keep the tenant management table independent from the shared directory.
  // Search and pagination on the Tenants page must not shrink selectors,
  // billing data, usage summaries, or the Overview page.
  const [tenants, setTenants] = useState<Resource<Tenant[]>>({
    data: [],
    loading: false,
    error: "",
    totalCount: 0,
  });
  const [tenantList, setTenantList] = useState<Resource<Tenant[]>>({
    data: [],
    loading: false,
    error: "",
    totalCount: 0,
  });
  const [users, setUsers] = useState<Resource<PlatformUser[]>>({
    data: [],
    loading: false,
    error: "",
    totalCount: 0,
  });
  const [overview, setOverview] = useState<Resource<PlatformOverview | null>>({
    data: null,
    loading: false,
    error: "",
  });
  const [system, setSystem] = useState<Resource<PlatformSystem | null>>({
    data: null,
    loading: false,
    error: "",
  });
  const [profile, setProfile] = useState<Resource<AdminProfile | null>>({
    data: null,
    loading: false,
    error: "",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadTenants = useCallback(async () => {
    setTenants((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await platformApi.listTenants({ pageSize: 100, start: 0 });
      setTenants({
        data: Array.isArray(result.tenants) ? result.tenants : [],
        totalCount: Number(result.totalCount) || 0,
        loading: false,
        error: "",
      });
    } catch (error) {
      setTenants((current) => ({
        ...current,
        loading: false,
        error: errorMessage(error, "Unable to load tenants."),
      }));
      throw error;
    }
  }, []);

  const loadTenantList = useCallback(async (options: ListOptions = {}) => {
    setTenantList((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await platformApi.listTenants(options);
      setTenantList({
        data: Array.isArray(result.tenants) ? result.tenants : [],
        totalCount: Number(result.totalCount) || 0,
        loading: false,
        error: "",
      });
    } catch (error) {
      setTenantList((current) => ({
        ...current,
        loading: false,
        error: errorMessage(error, "Unable to load tenants."),
      }));
      throw error;
    }
  }, []);

  const loadUsers = useCallback(async (options: UserListOptions = {}) => {
    setUsers((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await platformApi.listUsers(options);
      setUsers({
        data: Array.isArray(result.users) ? result.users : [],
        totalCount: Number(result.totalCount) || 0,
        loading: false,
        error: "",
      });
    } catch (error) {
      setUsers((current) => ({
        ...current,
        loading: false,
        error: errorMessage(error, "Unable to load users."),
      }));
      throw error;
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setOverview((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await platformApi.getOverview();
      setOverview({ data: result, loading: false, error: "" });
    } catch (error) {
      setOverview((current) => ({
        ...current,
        loading: false,
        error: errorMessage(error, "Unable to load platform totals."),
      }));
      throw error;
    }
  }, []);

  const loadSystem = useCallback(async () => {
    setSystem((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await platformApi.getSystem();
      setSystem({ data: result, loading: false, error: "" });
    } catch (error) {
      setSystem((current) => ({
        ...current,
        loading: false,
        error: errorMessage(error, "Unable to load system health."),
      }));
      throw error;
    }
  }, []);

  const loadProfile = useCallback(async () => {
    setProfile((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await platformApi.getCurrentProfile();
      setProfile({ data: result, loading: false, error: "" });
    } catch (error) {
      setProfile((current) => ({
        ...current,
        loading: false,
        error: errorMessage(error, "Unable to load administrator profile."),
      }));
      throw error;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    const results = await Promise.allSettled([
      loadOverview(),
      loadTenants(),
      loadTenantList(),
      loadUsers(),
      loadSystem(),
      loadProfile(),
    ]);
    if (results.some((result) => result.status === "fulfilled")) {
      setLastUpdated(new Date());
    }
    setRefreshing(false);
  }, [
    enabled,
    loadOverview,
    loadProfile,
    loadSystem,
    loadTenantList,
    loadTenants,
    loadUsers,
  ]);

  useEffect(() => {
    if (enabled) void refreshAll();
  }, [enabled, refreshAll]);

  return {
    tenants,
    tenantList,
    users,
    overview,
    system,
    profile,
    refreshing,
    lastUpdated,
    refreshAll,
    loadTenants,
    loadTenantList,
    loadUsers,
    loadOverview,
    loadSystem,
    loadProfile,
  };
}
