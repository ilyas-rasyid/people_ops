import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { LeaveRequest, PageResult } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { LoadingState, EmptyState, ErrorState } from "../../../shared/components/Feedback";
import { Pagination } from "../../../shared/components/Pagination";
import { readableDate } from "../../../shared/lib/format";

export function ApprovalQueuePage({ all = false }: { all?: boolean }) {
  const [tab, setTab] = useState("PENDING");
  const [page, setPage] = useState(1);
  const path = all ? "/leave/requests" : "/approvals";
  const query = useQuery({
    queryKey: ["approvals", all, tab, page],
    queryFn: () =>
      api<PageResult<LeaveRequest>>(
        `${path}?${new URLSearchParams({ status: tab, page: String(page), pageSize: "20" })}`,
      ),
  });
  return (
    <div className="page-fade">
      <PageHeader
        eyebrow="PEOPLE OPERATIONS / TIME OFF"
        title={all ? "Leave management" : "Approvals"}
        description={
          all
            ? "Review company leave requests and their decisions."
            : "Review and respond to requests assigned to you."
        }
      />
      <section className="panel">
        <div className="tabs tabs-inline" role="tablist">
          {["PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((item) => (
            <button
              key={item}
              className={tab === item ? "tab-active" : ""}
              role="tab"
              aria-selected={tab === item}
              onClick={() => {
                setTab(item);
                setPage(1);
              }}
            >
              {item[0] + item.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : !query.data?.items.length ? (
          <EmptyState
            title={`No ${tab.toLowerCase()} requests`}
            description="Requests matching this status will appear here."
          />
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.employee?.fullName}</strong>
                        <small className="block-muted">{item.employee?.employeeCode}</small>
                      </td>
                      <td>{item.leaveType?.name}</td>
                      <td>
                        {readableDate(item.startDate)} – {readableDate(item.endDate)}
                      </td>
                      <td>{item.requestedDays}</td>
                      <td>{readableDate(item.submittedAt)}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <Link
                          className="table-action"
                          to={`/app/approvals/${item.id}`}
                          aria-label="View approval"
                        >
                          <ArrowUpRight size={18} />
                        </Link>
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
    </div>
  );
}
