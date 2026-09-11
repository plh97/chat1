import {
  ArrowUpRight,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  platformApi,
  type ListOptions,
  type TenantInput,
  type TenantUpdateInput,
} from "../api";
import {
  formatBytes,
  formatCount,
  formatDate,
  tenantPlanLabel,
  type Tenant,
  type TenantStatus,
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

const emptyTenant: TenantInput = {
  name: "",
  slug: "",
  ownerEmail: "",
  ownerPassword: "",
  plan: "pro",
  trialDays: 14,
};

const statusCopy: Record<TenantStatus, string> = {
  active: "Active",
  trial: "Trial",
  suspended: "Suspended",
  archived: "Archived",
};

interface TenantsPageProps {
  resource: Resource<Tenant[]>;
  compact?: boolean;
  onRetry: () => void;
  onLoad?: (options?: ListOptions) => Promise<void>;
  onChanged: () => Promise<void>;
  onViewAll?: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
}

export function TenantsPage({
  resource,
  compact = false,
  onRetry,
  onLoad,
  onChanged,
  onViewAll,
  notify,
}: TenantsPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | TenantStatus>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantInput>(emptyTenant);
  const [editStatus, setEditStatus] = useState<TenantStatus>("active");
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isArchiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [formError, setFormError] = useState("");

  const pageSize = 25;
  const requestOptions = useMemo<ListOptions>(
    () => ({
      q: query,
      status,
      pageSize,
      start: pageIndex * pageSize,
    }),
    [pageIndex, query, status],
  );
  const visible = compact ? resource.data.slice(0, 5) : resource.data;
  const totalCount = resource.totalCount ?? visible.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (compact || !onLoad) return;
    const timer = window.setTimeout(() => {
      void onLoad(requestOptions);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [compact, onLoad, requestOptions]);

  useEffect(() => {
    if (compact || !onLoad) return;
    const refresh = () => void onLoad(requestOptions);
    window.addEventListener("platform:refresh-current-page", refresh);
    return () =>
      window.removeEventListener("platform:refresh-current-page", refresh);
  }, [compact, onLoad, requestOptions]);

  const closeEditor = () => {
    if (isSaving || isArchiving) return;
    setEditorOpen(false);
    setConfirmArchive(false);
    setFormError("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyTenant);
    setEditStatus("trial");
    setConfirmArchive(false);
    setFormError("");
    setEditorOpen(true);
  };

  const openEdit = (tenant: Tenant) => {
    setEditing(tenant);
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      ownerEmail: tenant.ownerEmail,
      ownerPassword: "",
      plan: tenant.plan,
      trialDays: 14,
      memberLimit: tenant.memberLimit,
      storageLimit: tenant.storageLimit,
    });
    setEditStatus(tenant.status);
    setConfirmArchive(false);
    setFormError("");
    setEditorOpen(true);
  };

  const validate = () => {
    if (!form.name.trim()) return "Workspace name is required.";
    if (form.name.trim().length > 100) {
      return "Workspace name must be 100 characters or fewer.";
    }
    if (!editing && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      return "Slug may only contain lowercase letters, numbers and hyphens.";
    }
    if (!editing && form.slug.length > 64) {
      return "Slug must be 64 characters or fewer.";
    }
    if (!editing && !/^\S+@\S+\.\S+$/.test(form.ownerEmail)) {
      return "Enter a valid owner email address.";
    }
    if (!editing && form.ownerPassword.length < 8) {
      return "Initial password must contain at least 8 characters.";
    }
    if (
      !editing &&
      (!Number.isInteger(form.trialDays) ||
        form.trialDays < 1 ||
        form.trialDays > 365)
    ) {
      return "Trial length must be between 1 and 365 days.";
    }
    if (form.memberLimit !== undefined && form.memberLimit < 1) {
      return "Member limit must be at least 1.";
    }
    if (form.storageLimit !== undefined && form.storageLimit < 1) {
      return "Storage allocation must be greater than 0.";
    }
    return "";
  };

  const saveTenant = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validate();
    if (validation) {
      setFormError(validation);
      return;
    }

    setSaving(true);
    setFormError("");
    const action = editing ? "updated" : "created";
    try {
      if (editing) {
        const update: TenantUpdateInput = {
          name: form.name.trim(),
          plan: form.plan,
          status: editStatus,
          memberLimit: form.memberLimit,
          storageLimit: form.storageLimit,
        };
        await platformApi.updateTenant(editing.id, update);
      } else {
        await platformApi.createTenant({
          ...form,
          name: form.name.trim(),
          slug: form.slug.trim(),
          ownerEmail: form.ownerEmail.trim().toLowerCase(),
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save tenant.";
      setFormError(message);
      notify(message, "error");
      setSaving(false);
      return;
    }

    setEditorOpen(false);
    notify(`${form.name.trim()} was ${action}.`);
    try {
      await onChanged();
      if (editing) {
        await onLoad?.(requestOptions);
      } else {
        setQuery("");
        setStatus("all");
        setPageIndex(0);
        await onLoad?.({ pageSize, start: 0 });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh tenants.";
      notify(
        `${form.name.trim()} was ${action}, but the list could not refresh: ${message}`,
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const archiveTenant = async () => {
    if (!editing || editing.id === 1) return;
    setArchiving(true);
    setFormError("");
    try {
      await platformApi.archiveTenant(editing.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to archive tenant.";
      setFormError(message);
      notify(message, "error");
      setArchiving(false);
      return;
    }

    notify(`${editing.name} was archived.`);
    setEditorOpen(false);
    try {
      await onChanged();
      const nextPage =
        visible.length === 1 ? Math.max(0, pageIndex - 1) : pageIndex;
      setPageIndex(nextPage);
      await onLoad?.({
        ...requestOptions,
        start: nextPage * pageSize,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to refresh tenants.";
      notify(
        `${editing.name} was archived, but the list could not refresh: ${message}`,
        "error",
      );
    } finally {
      setArchiving(false);
    }
  };

  return (
    <section
      className={`panel tenant-panel ${compact ? "compact" : ""}`}
      aria-busy={resource.loading}
    >
      <SectionHeading
        eyebrow={compact ? "Live workspace data" : "Workspace management"}
        title={compact ? "Recently created tenants" : "All tenants"}
        action={
          <button type="button" className="primary-button" onClick={openCreate}>
            <Plus size={16} />
            Add tenant
          </button>
        }
      />

      {!compact && (
        <div className="table-tools">
          <label className="search-field">
            <Search size={16} />
            <span className="sr-only">Search tenants</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPageIndex(0);
              }}
              placeholder="Search tenant, owner, slug or ID"
            />
          </label>
          <label className="select-field">
            <span className="sr-only">Filter by tenant status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | TenantStatus);
                setPageIndex(0);
              }}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDown size={15} />
          </label>
          <span className="result-count">
            {totalCount
              ? `${pageIndex * pageSize + 1}–${Math.min(
                  pageIndex * pageSize + visible.length,
                  totalCount,
                )} of ${totalCount}`
              : "0 tenants"}
          </span>
        </div>
      )}

      <ErrorBanner
        message={resource.error}
        onRetry={
          compact || !onLoad ? onRetry : () => void onLoad(requestOptions)
        }
      />
      <div className="table-scroll" tabIndex={0}>
        <table>
          <caption className="sr-only">Platform tenants</caption>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Members</th>
              <th>Rooms</th>
              <th>Messages</th>
              {!compact && <th>Created</th>}
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {resource.loading && !resource.data.length && (
              <LoadingRows columns={compact ? 7 : 8} label="Loading tenants…" />
            )}
            {visible.map((tenant) => (
              <tr key={tenant.id}>
                <td>
                  <div className="tenant-cell">
                    <span className="tenant-avatar" aria-hidden="true">
                      {tenant.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>{tenant.name}</strong>
                      <small>
                        T-{tenant.id} · {tenant.ownerEmail || tenant.slug}
                      </small>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="plan">{tenantPlanLabel(tenant.plan)}</span>
                </td>
                <td>
                  <StatusBadge
                    status={tenant.status}
                    label={statusCopy[tenant.status]}
                  />
                </td>
                <td>
                  {tenant.memberCount.toLocaleString()} /{" "}
                  {tenant.memberLimit.toLocaleString()}
                </td>
                <td>{tenant.roomCount.toLocaleString()}</td>
                <td>{formatCount(tenant.messageCount)}</td>
                {!compact && <td>{formatDate(tenant.createdAt)}</td>}
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Manage ${tenant.name}`}
                    onClick={() => openEdit(tenant)}
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
              resource.data.length ? "No matching tenants" : "No tenants yet"
            }
            description={
              resource.data.length
                ? "Try a different search or status filter."
                : "Create the first workspace to get started."
            }
            action={
              !resource.data.length ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={openCreate}
                >
                  <Plus size={15} />
                  Add tenant
                </button>
              ) : undefined
            }
          />
        )}
      </div>

      {!compact && totalCount > pageSize && (
        <div className="pagination" aria-label="Tenant list pagination">
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

      {resource.loading && resource.data.length > 0 && (
        <div className="updating-state" role="status">
          Updating tenant data…
        </div>
      )}
      {compact && onViewAll && (
        <button type="button" className="text-button" onClick={onViewAll}>
          View all tenants <ArrowUpRight size={14} />
        </button>
      )}

      {isEditorOpen && (
        <Modal
          eyebrow={editing ? "Workspace settings" : "Provision workspace"}
          title={editing ? `Manage ${editing.name}` : "Add a tenant"}
          label={editing ? `Manage ${editing.name}` : "Create tenant"}
          onClose={closeEditor}
        >
          <form onSubmit={saveTenant} noValidate>
            <div className="form-grid">
              <label className="full-field">
                Workspace name
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  maxLength={100}
                  placeholder="Acme Inc."
                  autoFocus
                  required
                />
              </label>
              {!editing && (
                <>
                  <label>
                    Workspace slug
                    <input
                      value={form.slug}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          slug: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        })
                      }
                      maxLength={64}
                      placeholder="acme"
                      required
                    />
                  </label>
                  <label>
                    Trial days
                    <input
                      value={form.trialDays}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          trialDays: Number(event.target.value),
                        })
                      }
                      type="number"
                      min={1}
                      max={365}
                    />
                  </label>
                  <label className="full-field">
                    Owner email
                    <input
                      value={form.ownerEmail}
                      onChange={(event) =>
                        setForm({ ...form, ownerEmail: event.target.value })
                      }
                      type="email"
                      placeholder="owner@company.com"
                      required
                    />
                  </label>
                  <label className="full-field">
                    Initial password
                    <input
                      value={form.ownerPassword}
                      onChange={(event) =>
                        setForm({ ...form, ownerPassword: event.target.value })
                      }
                      type="password"
                      minLength={8}
                      autoComplete="new-password"
                      required
                    />
                    <small>
                      At least 8 characters; used for the first login.
                    </small>
                  </label>
                </>
              )}
              <label>
                Plan
                <select
                  value={form.plan}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      plan: event.target.value as TenantInput["plan"],
                    })
                  }
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </select>
              </label>
              {editing && (
                <label>
                  Status
                  <select
                    value={editStatus}
                    disabled={editing.id === 1}
                    title={
                      editing.id === 1
                        ? "The default tenant must remain active"
                        : undefined
                    }
                    onChange={(event) =>
                      setEditStatus(event.target.value as TenantStatus)
                    }
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    {editing.status === "archived" && (
                      <option value="archived">Archived</option>
                    )}
                  </select>
                </label>
              )}
              {editing && (
                <>
                  <label>
                    Member limit
                    <input
                      value={form.memberLimit ?? ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          memberLimit: Number(event.target.value),
                        })
                      }
                      type="number"
                      min={1}
                    />
                  </label>
                  <label>
                    Storage allocation (bytes)
                    <input
                      value={form.storageLimit ?? ""}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          storageLimit: Number(event.target.value),
                        })
                      }
                      type="number"
                      min={1}
                    />
                    <small>{formatBytes(form.storageLimit ?? 0)}</small>
                  </label>
                </>
              )}
            </div>

            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}

            {confirmArchive && editing && (
              <div className="danger-confirm" role="alert">
                <div>
                  <strong>Archive {editing.name}?</strong>
                  <p>The workspace will no longer be active.</p>
                </div>
                <button
                  type="button"
                  className="danger-button"
                  disabled={isArchiving}
                  onClick={() => void archiveTenant()}
                >
                  <Trash2 size={15} />
                  {isArchiving ? "Archiving…" : "Confirm archive"}
                </button>
              </div>
            )}

            <div className="modal-actions">
              {editing &&
                editing.id !== 1 &&
                editing.status !== "archived" &&
                !confirmArchive && (
                  <button
                    type="button"
                    className="danger-link"
                    onClick={() => setConfirmArchive(true)}
                  >
                    Archive tenant
                  </button>
                )}
              <span className="modal-actions-spacer" />
              <button
                type="button"
                className="secondary-button"
                onClick={closeEditor}
                disabled={isSaving || isArchiving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={isSaving || isArchiving}
              >
                <Sparkles size={16} />
                {isSaving
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Create tenant"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
