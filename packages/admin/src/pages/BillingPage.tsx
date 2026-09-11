import { CreditCard, Hourglass, Layers3, ShieldAlert } from "lucide-react";
import {
  formatDate,
  tenantPlanLabel,
  type Tenant,
  type TenantPlan,
} from "../data";
import type { Resource } from "../usePlatformData";
import {
  EmptyState,
  ErrorBanner,
  LoadingRows,
  SectionHeading,
  StatusBadge,
} from "../components/Ui";

export function BillingPage({
  tenants,
  onRetry,
}: {
  tenants: Resource<Tenant[]>;
  onRetry: () => void;
}) {
  const plans: TenantPlan[] = ["starter", "pro", "business"];
  const active = tenants.data.filter(
    (tenant) => tenant.status === "active",
  ).length;
  const trials = tenants.data.filter(
    (tenant) => tenant.status === "trial",
  ).length;
  const attention = tenants.data.filter((tenant) =>
    ["suspended"].includes(tenant.status),
  ).length;

  return (
    <>
      <div className="metrics-grid billing-metrics">
        <article className="metric-card">
          <div className="metric-icon cyan">
            <CreditCard size={18} />
          </div>
          <p>Active plans</p>
          <div className="metric-value">
            <strong>{active.toLocaleString()}</strong>
            <span>Tenant records</span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-icon violet">
            <Hourglass size={18} />
          </div>
          <p>Trials</p>
          <div className="metric-value">
            <strong>{trials.toLocaleString()}</strong>
            <span>Current workspaces</span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-icon amber">
            <ShieldAlert size={18} />
          </div>
          <p>Needs attention</p>
          <div className="metric-value">
            <strong>{attention.toLocaleString()}</strong>
            <span>Suspended workspaces</span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-icon emerald">
            <Layers3 size={18} />
          </div>
          <p>Tenant records</p>
          <div className="metric-value">
            <strong>
              {(tenants.totalCount ?? tenants.data.length).toLocaleString()}
            </strong>
            <span>All plan states</span>
          </div>
        </article>
      </div>

      <div className="overview-grid billing-grid">
        <section className="panel">
          <SectionHeading eyebrow="Tenant contracts" title="Plans and trials" />
          <ErrorBanner message={tenants.error} onRetry={onRetry} />
          <div className="table-scroll" tabIndex={0}>
            <table>
              <caption className="sr-only">
                Tenant plan and trial status
              </caption>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Trial ends</th>
                </tr>
              </thead>
              <tbody>
                {tenants.loading && !tenants.data.length && (
                  <LoadingRows columns={4} label="Loading plans…" />
                )}
                {tenants.data.map((tenant) => (
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
                      <span className="plan">
                        {tenantPlanLabel(tenant.plan)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge
                        status={tenant.status}
                        label={tenant.status.replaceAll("_", " ")}
                      />
                    </td>
                    <td>{formatDate(tenant.trialEndsAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tenants.loading && !tenants.error && !tenants.data.length && (
              <EmptyState
                title="No plan records"
                description="Tenant plans will appear after a workspace is created."
              />
            )}
          </div>
        </section>

        <section className="panel plan-mix">
          <SectionHeading eyebrow="Current tenant records" title="Plan mix" />
          <div className="plan-mix-list">
            {plans.map((plan) => {
              const count = tenants.data.filter(
                (tenant) => tenant.plan === plan,
              ).length;
              const percent = tenants.data.length
                ? Math.round((count / tenants.data.length) * 100)
                : 0;
              return (
                <div key={plan}>
                  <div>
                    <strong>{tenantPlanLabel(plan)}</strong>
                    <span>
                      {count} tenant{count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="progress-track">
                    <i style={{ width: `${percent}%` }} />
                  </div>
                  <small>{percent}%</small>
                </div>
              );
            })}
          </div>
          <p className="data-scope-note">
            Plan distribution comes from tenant records. Revenue, invoices and
            payment processor events are not included in this API.
          </p>
        </section>
      </div>
    </>
  );
}
