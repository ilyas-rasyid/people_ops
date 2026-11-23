import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Plus } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { LeaveBalance, LeaveRequest, PageResult } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { Panel } from "../../../shared/components/Controls";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { ErrorState, EmptyState, LoadingState } from "../../../shared/components/Feedback";
import { LeaveBalanceSummary } from "../components/LeaveBalanceSummary";
import { readableDate } from "../../../shared/lib/format";

export function MyLeavePage() {
  const balance = useQuery({
    queryKey: ["my-leave-balance"],
    queryFn: () => api<LeaveBalance>("/me/leave/balance"),
  });
  const requests = useQuery({
    queryKey: ["my-leave-requests"],
    queryFn: () => api<PageResult<LeaveRequest>>("/me/leave/requests?pageSize=50"),
  });
  return (
    <div className="page-fade">
      <PageHeader
        eyebrow="MY WORKSPACE / TIME OFF"
        title="My leave"
        description="Plan time off and keep track of your leave balance."
        action={
          <Link to="/app/me/leave/new" className="btn btn-primary">
            <Plus size={17} />
            Request leave
          </Link>
        }
      />
      <Panel title="Annual leave balance">
        {balance.isLoading ? (
          <LoadingState />
        ) : balance.error ? (
          <ErrorState error={balance.error} />
        ) : (
          balance.data && <LeaveBalanceSummary balance={balance.data} />
        )}
      </Panel>
      <div className="section-spacer" />
      <Panel title="Leave requests">
        {requests.isLoading ? (
          <LoadingState />
        ) : requests.error ? (
          <ErrorState error={requests.error} />
        ) : !requests.data?.items.length ? (
          <EmptyState
            title="No leave requests yet"
            description="When you request time off, it appears here."
          />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave type</th>
                  <th>Date range</th>
                  <th>Workdays</th>
                  <th>Requested</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {requests.data.items.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.leaveType?.name}</strong>
                    </td>
                    <td>
                      {readableDate(request.startDate)} – {readableDate(request.endDate)}
                    </td>
                    <td>{request.requestedDays} days</td>
                    <td>{readableDate(request.submittedAt)}</td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                    <td>
                      <Link
                        className="table-action"
                        to={`/app/me/leave/${request.id}`}
                        aria-label="View leave request"
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
