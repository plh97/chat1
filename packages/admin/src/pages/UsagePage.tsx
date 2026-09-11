import { Database, MessageSquareText, Network, Users } from "lucide-react";
import {
  formatBytes,
  formatCount,
  type PlatformOverview,
  type Tenant,
} from "../data";
import type { Resource } from "../usePlatformData";
import {
  EmptyState,
  ErrorBanner,
  LoadingRows,
  SectionHeading,
} from "../components/Ui";

export function UsagePage({
  tenants,
  overview,
  onRetry,
}: {
  tenants: Resource<Tenant[]>;
  overview: Resource<PlatformOverview | null>;
  onRetry: () => void;
}) {
  const loadedMembers = tenants.data.reduce(
    (total, tenant) => total + tenant.memberCount,
    0,
  );
  const loadedRooms = tenants.data.reduce(
    (total, tenant) => total + tenant.roomCount,
    0,
  );
  const loadedMessages = tenants.data.reduce(
    (total, tenant) => total + tenant.messageCount,
    0,
  );
  const storageAllocated = tenants.data.reduce(
    (total, tenant) => total + tenant.storageLimit,
    0,
  );

  const metrics = [
    {
      icon: Users,
      label: "Users",
      value: overview.data?.userCount ?? loadedMembers,
      context: "Current accounts",
      tone: "cyan",
    },
    {
      icon: Network,
      label: "Rooms",
      value: overview.data?.roomCount ?? loadedRooms,
      context: "Current rooms",
      tone: "violet",
    },
    {
      icon: MessageSquareText,
      label: "Messages",
      value: overview.data?.messageCount ?? loadedMessages,
      context: "Lifetime total",
      tone: "amber",
    },
  ] as const;

  return (
    <>
      <div className="metrics-grid usage-metrics">
        {metrics.map(({ icon: Icon, label, value, context, tone }) => (
          <article className="metric-card" key={label}>
            <div className={`metric-icon ${tone}`}>
              <Icon size={18} />
            </div>
            <p>{label}</p>
            <div className="metric-value">
              <strong>{formatCount(value)}</strong>
              <span>{context}</span>
            </div>
          </article>
        ))}
        <article className="metric-card">
          <div className="metric-icon emerald">
            <Database size={18} />
          </div>
          <p>Storage allocation</p>
          <div className="metric-value">
            <strong>{formatBytes(storageAllocated)}</strong>
            <span>Configured capacity</span>
          </div>
        </article>
      </div>

      <section className="panel tenant-panel usage-table">
        <SectionHeading
          eyebrow="Current tenant totals"
          title="Capacity and usage"
        />
        <ErrorBanner
          message={tenants.error || overview.error}
          onRetry={onRetry}
        />
        <div className="table-scroll" tabIndex={0}>
          <table>
            <caption className="sr-only">
              Tenant capacity and cumulative usage
            </caption>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Member capacity</th>
                <th>Rooms</th>
                <th>Messages</th>
                <th>Storage allocation</th>
              </tr>
            </thead>
            <tbody>
              {tenants.loading && !tenants.data.length && (
                <LoadingRows columns={5} label="Loading usage…" />
              )}
              {tenants.data.map((tenant) => {
                const percentage = tenant.memberLimit
                  ? Math.round((tenant.memberCount / tenant.memberLimit) * 100)
                  : 0;
                return (
                  <tr key={tenant.id}>
                    <td>
                      <div className="tenant-cell">
                        <span className="tenant-avatar" aria-hidden="true">
                          {tenant.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <strong>{tenant.name}</strong>
                          <small>{tenant.slug}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="quota-cell">
                        <div>
                          <strong>
                            {tenant.memberCount.toLocaleString()} /{" "}
                            {tenant.memberLimit.toLocaleString()}
                          </strong>
                          <span className={percentage >= 90 ? "warning" : ""}>
                            {percentage}%
                          </span>
                        </div>
                        <div className="progress-track">
                          <i
                            className={percentage >= 90 ? "warning" : ""}
                            style={{
                              width: `${Math.min(100, percentage)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>{tenant.roomCount.toLocaleString()}</td>
                    <td>{formatCount(tenant.messageCount)}</td>
                    <td>{formatBytes(tenant.storageLimit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!tenants.loading && !tenants.error && !tenants.data.length && (
            <EmptyState
              title="No usage records"
              description="Capacity data will appear after a tenant is created."
            />
          )}
        </div>
        <p className="data-scope-note table-note">
          Messages are lifetime totals. Storage shows configured allocation
          because the platform API does not yet report bytes consumed.
        </p>
      </section>
    </>
  );
}
