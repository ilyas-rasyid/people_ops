import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { PageResult } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { LoadingState, EmptyState, ErrorState } from "../../../shared/components/Feedback";
import { Pagination } from "../../../shared/components/Pagination";
import { Modal } from "../../../shared/components/Modal";
import { readableDate } from "../../../shared/lib/format";

type AuditEvent = {
  id: string;
  eventType: string;
  resource: string;
  resourceId: string;
  actorId: string | null;
  createdAt: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
};
export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const query = useQuery({
    queryKey: ["audit", page],
    queryFn: () => api<PageResult<AuditEvent>>(`/audit-logs?page=${page}&pageSize=20`),
  });
  return (
    <div className="page-fade">
      <PageHeader
        eyebrow="ADMINISTRATION / COMPLIANCE"
        title="Audit log"
        description="A read-only history of important changes across your workspace."
      />
      <section className="panel">
        {query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : !query.data?.items.length ? (
          <EmptyState />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Resource</th>
                    <th>Actor</th>
                    <th>Occurred</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.eventType.replaceAll("_", " ")}</strong>
                      </td>
                      <td>{item.resource}</td>
                      <td className="mono-value">{item.actorId?.slice(0, 8) ?? "System"}</td>
                      <td>{readableDate(item.createdAt)}</td>
                      <td>
                        <button
                          className="table-action"
                          onClick={() => setSelected(item)}
                          aria-label="View audit details"
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={query.data.total} onChange={setPage} />
          </>
        )}
      </section>
      {selected && (
        <Modal title="Audit event detail" onClose={() => setSelected(null)}>
          <div className="detail-grid">
            <div className="detail-field">
              <span>Event</span>
              <strong>{selected.eventType}</strong>
            </div>
            <div className="detail-field">
              <span>Resource</span>
              <strong>{selected.resource}</strong>
            </div>
            <div className="detail-field">
              <span>Timestamp</span>
              <strong>{readableDate(selected.createdAt)}</strong>
            </div>
            <div className="detail-field">
              <span>Reason</span>
              <strong>{selected.reason || "—"}</strong>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
