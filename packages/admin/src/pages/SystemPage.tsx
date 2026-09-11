import {
  CheckCircle2,
  Database,
  RefreshCw,
  Server,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { formatDateTime, type PlatformSystem } from "../data";
import type { Resource } from "../usePlatformData";
import { ErrorBanner, SectionHeading, StatusBadge } from "../components/Ui";

const isOperational = (value?: string) =>
  ["operational", "connected", "healthy", "ok", "up"].includes(
    value?.toLowerCase() ?? "",
  );

export function SystemPage({
  system,
  onRetry,
}: {
  system: Resource<PlatformSystem | null>;
  onRetry: () => void;
}) {
  const apiHealthy = Boolean(system.data) && !system.error;
  const databaseHealthy = isOperational(system.data?.database);
  const overallHealthy = isOperational(system.data?.status);

  return (
    <>
      <ErrorBanner message={system.error} onRetry={onRetry} />
      <section className="panel system-panel" aria-busy={system.loading}>
        <SectionHeading
          eyebrow="Live platform check"
          title="Service health"
          action={
            <button
              type="button"
              className="secondary-button"
              onClick={onRetry}
              disabled={system.loading}
            >
              <RefreshCw
                size={15}
                className={system.loading ? "spin" : undefined}
              />
              {system.loading ? "Checking…" : "Run check"}
            </button>
          }
        />

        <div className="service-grid">
          <article className="service-card">
            <span
              className={apiHealthy ? "service-icon healthy" : "service-icon"}
            >
              {apiHealthy ? <Server size={20} /> : <WifiOff size={20} />}
            </span>
            <div>
              <p>Platform API</p>
              <strong>{apiHealthy ? "Reachable" : "Unavailable"}</strong>
              <small>
                {apiHealthy
                  ? "Authenticated health endpoint responded"
                  : "No successful health response"}
              </small>
            </div>
            <StatusBadge
              status={apiHealthy ? "healthy" : "degraded"}
              label={apiHealthy ? "Operational" : "Degraded"}
            />
          </article>

          <article className="service-card">
            <span
              className={
                databaseHealthy ? "service-icon healthy" : "service-icon"
              }
            >
              <Database size={20} />
            </span>
            <div>
              <p>Database</p>
              <strong>{system.data?.database ?? "Unknown"}</strong>
              <small>Connectivity reported by the platform API</small>
            </div>
            <StatusBadge
              status={
                system.data
                  ? databaseHealthy
                    ? "healthy"
                    : "degraded"
                  : "unknown"
              }
              label={
                system.data
                  ? databaseHealthy
                    ? "Connected"
                    : "Degraded"
                  : "Unknown"
              }
            />
          </article>

          <article className="service-card">
            <span
              className={
                overallHealthy ? "service-icon healthy" : "service-icon"
              }
            >
              {overallHealthy ? (
                <CheckCircle2 size={20} />
              ) : (
                <ShieldCheck size={20} />
              )}
            </span>
            <div>
              <p>Overall status</p>
              <strong>{system.data?.status ?? "Unknown"}</strong>
              <small>
                Last checked {formatDateTime(system.data?.checkedAt)}
              </small>
            </div>
            <StatusBadge
              status={
                system.data
                  ? overallHealthy
                    ? "healthy"
                    : "degraded"
                  : "unknown"
              }
              label={
                system.data
                  ? overallHealthy
                    ? "Operational"
                    : "Degraded"
                  : "Unknown"
              }
            />
          </article>
        </div>

        {!system.data && system.loading && (
          <div className="panel-loading" role="status">
            Checking system health…
          </div>
        )}
        <p className="data-scope-note">
          This check verifies the platform API and its database connection.
          WebSocket, queue and object-storage probes are not part of the current
          endpoint.
        </p>
      </section>
    </>
  );
}
