import { Building2, MessageSquareText, Network, Users } from "lucide-react";
import { formatCount, type PlatformOverview, type Tenant } from "../data";
import type { Resource } from "../usePlatformData";
import { EmptyState, ErrorBanner, SectionHeading } from "../components/Ui";
import { TenantsPage } from "./TenantsPage";

function MetricCard({
  icon: Icon,
  label,
  value,
  context,
  tone = "cyan",
  loading,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  context: string;
  tone?: "cyan" | "violet" | "emerald" | "amber";
  loading?: boolean;
}) {
  return (
    <article className="metric-card" aria-busy={loading}>
      <div className={`metric-icon ${tone}`}>
        <Icon size={18} />
      </div>
      <p>{label}</p>
      <div className="metric-value">
        <strong className={loading ? "skeleton-value" : ""}>
          {loading ? "…" : value}
        </strong>
        <span>{context}</span>
      </div>
    </article>
  );
}

interface OverviewPageProps {
  overview: Resource<PlatformOverview | null>;
  tenants: Resource<Tenant[]>;
  onRetryOverview: () => void;
  onRetryTenants: () => void;
  onTenantChanged: () => Promise<void>;
  onViewTenants: () => void;
  notify: (message: string, tone?: "success" | "error") => void;
}

export function OverviewPage({
  overview,
  tenants,
  onRetryOverview,
  onRetryTenants,
  onTenantChanged,
  onViewTenants,
  notify,
}: OverviewPageProps) {
  const totals = overview.data;
  const topTenants = [...tenants.data]
    .sort((left, right) => right.messageCount - left.messageCount)
    .slice(0, 5);
  const maxMessages = Math.max(
    1,
    ...topTenants.map((tenant) => tenant.messageCount),
  );

  return (
    <>
      <ErrorBanner message={overview.error} onRetry={onRetryOverview} />
      <div className="metrics-grid">
        <MetricCard
          icon={Building2}
          label="Active tenants"
          value={formatCount(totals?.activeTenants ?? 0)}
          context={`${formatCount(totals?.tenantCount ?? 0)} total`}
          loading={overview.loading && !totals}
        />
        <MetricCard
          icon={Users}
          label="Users"
          value={formatCount(totals?.userCount ?? 0)}
          context="Across all tenants"
          tone="violet"
          loading={overview.loading && !totals}
        />
        <MetricCard
          icon={Network}
          label="Rooms"
          value={formatCount(totals?.roomCount ?? 0)}
          context="Current total"
          tone="emerald"
          loading={overview.loading && !totals}
        />
        <MetricCard
          icon={MessageSquareText}
          label="Messages delivered"
          value={formatCount(totals?.messageCount ?? 0)}
          context="Lifetime total"
          tone="amber"
          loading={overview.loading && !totals}
        />
      </div>

      <section className="panel usage-leaderboard">
        <SectionHeading
          eyebrow="Cumulative message volume"
          title="Most active tenants"
        />
        <ErrorBanner message={tenants.error} onRetry={onRetryTenants} />
        {topTenants.length ? (
          <div className="usage-bars">
            {topTenants.map((tenant) => (
              <div className="usage-bar-row" key={tenant.id}>
                <div>
                  <strong>{tenant.name}</strong>
                  <span>{formatCount(tenant.messageCount)}</span>
                </div>
                <div className="progress-track">
                  <i
                    style={{
                      width: `${Math.max(
                        3,
                        (tenant.messageCount / maxMessages) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          !tenants.loading &&
          !tenants.error && (
            <EmptyState
              title="No usage yet"
              description="Message totals will appear after tenants start chatting."
            />
          )
        )}
        {tenants.loading && !tenants.data.length && (
          <div className="panel-loading" role="status">
            Loading usage summary…
          </div>
        )}
      </section>

      <TenantsPage
        compact
        resource={tenants}
        onRetry={onRetryTenants}
        onChanged={onTenantChanged}
        onViewAll={onViewTenants}
        notify={notify}
      />
    </>
  );
}
