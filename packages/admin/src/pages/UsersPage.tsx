import {
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  UserPlus,
  UserRoundX,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  platformApi,
  type TenantUserUpdateInput,
  type UserListOptions,
} from "../api";
import {
  formatDate,
  userRoleLabel,
  type PlatformUser,
  type PlatformUserRole,
  type PlatformUserStatus,
  type Tenant,
} from "../data";
import type { Resource } from "../usePlatformData";
import {
  EmptyState,
  ErrorBanner,
  LoadingRows,
  Modal,
  SectionHeading,
  StatusBadge,
} from "../components/Ui";

interface UsersPageProps {
  resource: Resource<PlatformUser[]>;
  tenants: Resource<Tenant[]>;
  onLoad: (options?: UserListOptions) => Promise<void>;
  onChanged: () => Promise<void>;
  notify: (message: string, tone?: "success" | "error") => void;
}

interface UserForm {
  tenantId: number;
  email: string;
  password: string;
  userName: string;
  role: Extract<PlatformUserRole, "tenant_owner" | "tenant_admin" | "member">;
  joinGeneral: boolean;
  status: PlatformUserStatus;
}

const emptyForm: UserForm = {
  tenantId: 0,
  email: "",
  password: "",
  userName: "",
  role: "member",
  joinGeneral: true,
  status: "active",
};

export function UsersPage({
  resource,
  tenants,
  onLoad,
  onChanged,
  notify,
}: UsersPageProps) {
  const [query, setQuery] = useState("");
  const [tenantId, setTenantId] = useState(0);
  const [status, setStatus] = useState<"all" | PlatformUserStatus>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [editing, setEditing] = useState<PlatformUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");

  const pageSize = 50;
  const requestOptions = useMemo<UserListOptions>(
    () => ({
      q: query,
      tenantId: tenantId || undefined,
      status,
      pageSize,
      start: pageIndex * pageSize,
    }),
    [pageIndex, query, status, tenantId],
  );
  const visible = resource.data;
  const totalCount = resource.totalCount ?? visible.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void onLoad(requestOptions);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [onLoad, requestOptions]);

  useEffect(() => {
    const refresh = () => void onLoad(requestOptions);
    window.addEventListener("platform:refresh-current-page", refresh);
    return () =>
      window.removeEventListener("platform:refresh-current-page", refresh);
  }, [onLoad, requestOptions]);

  const selectableTenants = tenants.data.filter(
    (tenant) => tenant.status !== "archived",
  );
  const editingPlatformAccount =
    editing?.role === "platform_owner" || editing?.role === "platform_admin";

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      tenantId: selectableTenants[0]?.id ?? 0,
    });
    setFormError("");
    setConfirmDelete(false);
    setEditorOpen(true);
  };

  const openEdit = (user: PlatformUser) => {
    setEditing(user);
    setForm({
      tenantId: user.tenantId,
      email: user.email,
      password: "",
      userName: user.userName,
      role:
        user.role === "tenant_owner" ||
        user.role === "tenant_admin" ||
        user.role === "member"
          ? user.role
          : "member",
      joinGeneral: false,
      status: user.status,
    });
    setFormError("");
    setConfirmDelete(false);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (isSaving || isDeleting) return;
    setEditorOpen(false);
    setConfirmDelete(false);
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    if (editingPlatformAccount) {
      setFormError(
        "Platform administrator accounts must be managed through a dedicated access workflow.",
      );
      return;
    }
    if (!editing && !form.tenantId) {
      setFormError("Choose a tenant for the new user.");
      return;
    }
    if (!editing && !/^\S+@\S+\.\S+$/.test(form.email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (!editing && form.password.length < 8) {
      setFormError("Initial password must contain at least 8 characters.");
      return;
    }
    if (editing && form.password && form.password.length < 8) {
      setFormError(
        "A replacement password must contain at least 8 characters.",
      );
      return;
    }

    setSaving(true);
    setFormError("");
    const email = form.email.trim();
    const action = editing ? "updated" : "created";
    try {
      if (editing) {
        const update: TenantUserUpdateInput = {
          userName: (form.userName ?? "").trim(),
          ...(!editingPlatformAccount
            ? { role: form.role, status: form.status }
            : {}),
          ...(form.password ? { password: form.password } : {}),
        };
        await platformApi.updateUser(editing.id, update);
      } else {
        await platformApi.createTenantUser(form.tenantId, {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          userName: (form.userName ?? "").trim() || undefined,
          role: form.role === "tenant_owner" ? "member" : form.role,
          joinGeneral: form.joinGeneral,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save user.";
      setFormError(message);
      notify(message, "error");
      setSaving(false);
      return;
    }

    setEditorOpen(false);
    notify(`${email} was ${action}.`);
    try {
      await onChanged();
      if (editing) {
        await onLoad(requestOptions);
      } else {
        setQuery("");
        setTenantId(0);
        setStatus("all");
        setPageIndex(0);
        await onLoad({ pageSize, start: 0 });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh users.";
      notify(
        `${email} was ${action}, but the list could not refresh: ${message}`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!editing) return;
    setDeleting(true);
    setFormError("");
    try {
      await platformApi.deleteUser(editing.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to remove user.";
      setFormError(message);
      notify(message, "error");
      setDeleting(false);
      return;
    }

    notify(`${editing.email} was removed.`);
    setEditorOpen(false);
    try {
      await onChanged();
      const nextPage =
        visible.length === 1 ? Math.max(0, pageIndex - 1) : pageIndex;
      setPageIndex(nextPage);
      await onLoad({
        ...requestOptions,
        start: nextPage * pageSize,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh users.";
      notify(
        `${editing.email} was removed, but the list could not refresh: ${message}`,
        "error",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="panel tenant-panel" aria-busy={resource.loading}>
      <SectionHeading
        eyebrow="Identity and access"
        title="User directory"
        action={
          <button
            type="button"
            className="primary-button"
            onClick={openCreate}
            disabled={!selectableTenants.length}
            title={
              selectableTenants.length
                ? undefined
                : "Create an active tenant first"
            }
          >
            <UserPlus size={16} />
            Add user
          </button>
        }
      />

      <div className="table-tools">
        <label className="search-field">
          <Search size={16} />
          <span className="sr-only">Search users</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPageIndex(0);
            }}
            placeholder="Search name, email, tenant or ID"
          />
        </label>
        <label className="select-field">
          <span className="sr-only">Filter by tenant</span>
          <select
            value={tenantId}
            onChange={(event) => {
              setTenantId(Number(event.target.value));
              setPageIndex(0);
            }}
          >
            <option value={0}>All tenants</option>
            {tenants.data.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
        <label className="select-field">
          <span className="sr-only">Filter by user status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as "all" | PlatformUserStatus);
              setPageIndex(0);
            }}
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <ChevronDown size={15} />
        </label>
        <span className="result-count">
          {totalCount
            ? `${pageIndex * pageSize + 1}–${Math.min(
                pageIndex * pageSize + visible.length,
                totalCount,
              )} of ${totalCount}`
            : "0 users"}
        </span>
      </div>

      {totalCount > pageSize && (
        <div className="pagination" aria-label="User list pagination">
          <button
            type="button"
            className="secondary-button"
            disabled={pageIndex === 0 || resource.loading}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          >
            Previous
          </button>
          <span>
            Page {pageIndex + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="secondary-button"
            disabled={pageIndex + 1 >= totalPages || resource.loading}
            onClick={() =>
              setPageIndex((current) => Math.min(totalPages - 1, current + 1))
            }
          >
            Next
          </button>
        </div>
      )}

      <ErrorBanner
        message={resource.error}
        onRetry={() => void onLoad(requestOptions)}
      />
      <div className="table-scroll" tabIndex={0}>
        <table>
          <caption className="sr-only">Platform user directory</caption>
          <thead>
            <tr>
              <th>User</th>
              <th>Tenant</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {resource.loading && !resource.data.length && (
              <LoadingRows columns={6} label="Loading users…" />
            )}
            {visible.map((user) => (
              <tr key={user.id}>
                <td>
                  <div className="tenant-cell">
                    <span className="tenant-avatar" aria-hidden="true">
                      {(user.userName || user.email).slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>{user.userName || "Unnamed user"}</strong>
                      <small>
                        U-{user.id} · {user.email}
                      </small>
                    </div>
                  </div>
                </td>
                <td>{user.tenantName || `Tenant ${user.tenantId}`}</td>
                <td>
                  <span className="plan">{userRoleLabel(user.role)}</span>
                </td>
                <td>
                  <StatusBadge
                    status={user.status === "active" ? "active" : "suspended"}
                    label={user.status === "active" ? "Active" : "Suspended"}
                  />
                </td>
                <td>{formatDate(user.createdAt)}</td>
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Manage ${user.email}`}
                    onClick={() => openEdit(user)}
                  >
                    <MoreHorizontal size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!resource.loading && !resource.error && !visible.length && (
          <EmptyState
            title={
              resource.data.length ? "No matching users" : "No users found"
            }
            description={
              resource.data.length
                ? "Try a different search or filter."
                : "Add a user to an active tenant."
            }
            action={
              !resource.data.length && selectableTenants.length ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={openCreate}
                >
                  <Plus size={15} />
                  Add user
                </button>
              ) : undefined
            }
          />
        )}
      </div>

      {resource.loading && resource.data.length > 0 && (
        <div className="updating-state" role="status">
          Updating user data…
        </div>
      )}

      {isEditorOpen && (
        <Modal
          eyebrow={editing ? "Identity settings" : "Provision account"}
          title={editing ? `Manage ${editing.email}` : "Add a user"}
          label={editing ? `Manage ${editing.email}` : "Create user"}
          onClose={closeEditor}
        >
          <form onSubmit={saveUser} noValidate>
            <div className="form-grid">
              <label className="full-field">
                Tenant
                <select
                  value={form.tenantId}
                  onChange={(event) =>
                    setForm({ ...form, tenantId: Number(event.target.value) })
                  }
                  disabled={Boolean(editing)}
                  required
                >
                  <option value={0}>Choose tenant</option>
                  {selectableTenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="full-field">
                Email
                <input
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  type="email"
                  disabled={Boolean(editing)}
                  required
                  autoFocus
                />
              </label>
              <label className="full-field">
                Display name
                <input
                  value={form.userName}
                  onChange={(event) =>
                    setForm({ ...form, userName: event.target.value })
                  }
                  disabled={editingPlatformAccount}
                  maxLength={100}
                  placeholder="Optional"
                />
              </label>
              {!editingPlatformAccount && (
                <label>
                  Role
                  <select
                    value={form.role}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        role: event.target.value as UserForm["role"],
                      })
                    }
                  >
                    <option value="member">Member</option>
                    <option value="tenant_admin">Tenant admin</option>
                    {editing?.role === "tenant_owner" && (
                      <option value="tenant_owner">Tenant owner</option>
                    )}
                  </select>
                </label>
              )}
              {editing && !editingPlatformAccount && (
                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as PlatformUserStatus,
                      })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
              )}
              {editingPlatformAccount && (
                <p className="protected-account-note full-field">
                  Platform administrator role and status are protected from the
                  tenant user editor.
                </p>
              )}
              {!editingPlatformAccount && (
                <label className="full-field">
                  {editing ? "New password" : "Initial password"}
                  <input
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    placeholder={
                      editing ? "Leave blank to keep current password" : ""
                    }
                    required={!editing}
                  />
                  <small>Passwords must contain at least 8 characters.</small>
                </label>
              )}
              {!editing && (
                <label className="checkbox-field full-field">
                  <input
                    type="checkbox"
                    checked={form.joinGeneral}
                    onChange={(event) =>
                      setForm({ ...form, joinGeneral: event.target.checked })
                    }
                  />
                  Add this user to the tenant&apos;s General room
                </label>
              )}
            </div>

            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}

            {confirmDelete && editing && (
              <div className="danger-confirm" role="alert">
                <div>
                  <strong>Remove {editing.email}?</strong>
                  <p>This account will lose access to its tenant.</p>
                </div>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => void deleteUser()}
                  disabled={isDeleting}
                >
                  <UserRoundX size={15} />
                  {isDeleting ? "Removing…" : "Confirm removal"}
                </button>
              </div>
            )}

            <div className="modal-actions">
              {editing &&
                editing.role !== "tenant_owner" &&
                editing.role !== "platform_owner" &&
                editing.role !== "platform_admin" &&
                !confirmDelete && (
                  <button
                    type="button"
                    className="danger-link"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Remove user
                  </button>
                )}
              <span className="modal-actions-spacer" />
              <button
                type="button"
                className="secondary-button"
                onClick={closeEditor}
                disabled={isSaving || isDeleting}
              >
                {editingPlatformAccount ? "Close" : "Cancel"}
              </button>
              {!editingPlatformAccount && (
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSaving || isDeleting}
                >
                  <UserPlus size={16} />
                  {isSaving
                    ? "Saving…"
                    : editing
                      ? "Save changes"
                      : "Create user"}
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
