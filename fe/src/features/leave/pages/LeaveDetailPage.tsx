import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { api } from "../../../shared/api/client";
import { useAuth } from "../../../app/providers/AuthProvider";
import type { LeaveRequest } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { Panel, PrimaryButton, SecondaryButton } from "../../../shared/components/Controls";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { LoadingState, ErrorState } from "../../../shared/components/Feedback";
import { Modal } from "../../../shared/components/Modal";
import { readableDate } from "../../../shared/lib/format";

export function LeaveDetailPage({ approval = false }: { approval?: boolean; }) {
  const { requestId } = useParams();
  const { user } = useAuth();
  const [action, setAction] = useState<"approve" | "reject" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const navigate = useNavigate();
  const cache = useQueryClient();
  const path = approval ? `/approvals/${requestId}` : `/me/leave/requests/${requestId}`;
  const query = useQuery({
    queryKey: ["leave-detail", requestId, approval],
    queryFn: () => api<LeaveRequest>(path),
  });
  const mutation = useMutation({
    mutationFn: (name: "approve" | "reject" | "cancel") => {
      const url = approval
        ? `/leave/requests/${requestId}/${name}`
        : `/me/leave/requests/${requestId}/cancel`;
      return api(url, {
        method: "POST",
        idempotent: true,
        body: {
          ...(name === "approve" || name === "reject"
            ? { expectedVersion: query.data?.version }
            : {}),
          ...(reason ? { reason } : {}),
        },
      });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["leave-detail", requestId] });
      await cache.invalidateQueries({ queryKey: [approval ? "approvals" : "my-leave"] });
      setAction(null);
      setReason("");
    },
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState error={query.error} />;
  const item = query.data;
  const back = approval ? "/app/approvals" : "/app/me/leave";
  return (
    <div className="page-fade narrow-page">
      <Link to={back} className="back-link">
        <ArrowLeft size={16} /> {approval ? "Approvals" : "My leave"}
      </Link>
      <PageHeader
        eyebrow={approval ? "APPROVALS / REVIEW" : "MY WORKSPACE / TIME OFF"}
        title={approval ? "Review leave request" : "Leave request details"}
        description={`Submitted ${readableDate(item.submittedAt)}`}
      />
      <Panel>
        <div className="leave-detail-header">
          <div>
            <span className="eyebrow-label">REQUEST STATUS</span>
            <div className="section-spacer-sm" />
            <StatusBadge status={item.status} />
          </div>
          <strong>{item.leaveType?.name}</strong>
        </div>
        <div className="detail-grid">
          <div className="detail-field">
            <span>Employee</span>
            <strong>{item.employee?.fullName ?? "You"}</strong>
          </div>
          <div className="detail-field">
            <span>Leave type</span>
            <strong>{item.leaveType?.name}</strong>
          </div>
          <div className="detail-field">
            <span>Start date</span>
            <strong>{readableDate(item.startDate)}</strong>
          </div>
          <div className="detail-field">
            <span>End date</span>
            <strong>{readableDate(item.endDate)}</strong>
          </div>
          <div className="detail-field">
            <span>Requested working days</span>
            <strong>{item.requestedDays} days</strong>
          </div>
          <div className="detail-field">
            <span>Assigned approver</span>
            <strong>{item.approver?.employee.fullName ?? "—"}</strong>
          </div>
        </div>
        {item.note && (
          <div className="note-section">
            <span>Note</span>
            <p>{item.note}</p>
          </div>
        )}
        {(item.status === "PENDING" ||
          (approval &&
            user?.role === "HR_ADMIN" &&
            item.status === "APPROVED" &&
            item.startDate.slice(0, 10) > new Date().toISOString().slice(0, 10))) && (
            <div className="panel-footer-actions">
              {approval && item.status === "APPROVED" ? (
                <SecondaryButton onClick={() => setAction("cancel")}>
                  Cancel approved leave
                </SecondaryButton>
              ) : approval ? (
                <>
                  <SecondaryButton onClick={() => setAction("reject")}>
                    Reject request
                  </SecondaryButton>
                  <PrimaryButton onClick={() => setAction("approve")}>Approve request</PrimaryButton>
                </>
              ) : (
                <SecondaryButton onClick={() => setAction("cancel")}>Cancel request</SecondaryButton>
              )}
            </div>
          )}
      </Panel>
      {mutation.error && <ErrorState error={mutation.error} />}
      {action && (
        <Modal
          title={
            action === "approve"
              ? "Approve leave"
              : action === "reject"
                ? "Reject leave"
                : "Cancel request"
          }
          onClose={() => setAction(null)}
          footer={
            <>
              <SecondaryButton onClick={() => setAction(null)}>Go back</SecondaryButton>
              <PrimaryButton
                disabled={
                  mutation.isPending ||
                  ((action === "reject" || (action === "cancel" && approval)) &&
                    reason.trim().length < 3)
                }
                onClick={() => mutation.mutate(action)}
              >
                {mutation.isPending
                  ? "Processing..."
                  : action === "approve"
                    ? "Confirm approval"
                    : action === "reject"
                      ? "Reject request"
                      : "Cancel request"}
              </PrimaryButton>
            </>
          }
        >
          <p>
            {action === "approve"
              ? `Approve ${item.requestedDays} working days of leave?`
              : action === "reject"
                ? "The employee will receive a rejected status and their reservation will be released."
                : "The pending request will be cancelled and reserved days released."}
          </p>
          {(action === "reject" || action === "approve" || (action === "cancel" && approval)) && (
            <label className="field">
              <span className="field-label">
                Reason{" "}
                {action === "reject" || action === "cancel"
                  ? "(required)"
                  : "(required for HR override)"}
              </span>
              <textarea
                className="input"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          {mutation.error && <ErrorState error={mutation.error} />}
        </Modal>
      )}
    </div>
  );
}
