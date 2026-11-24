import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { api } from "../../../shared/api/client";
import type { LeaveBalance, LeaveType } from "../../../shared/types/domain";
import { PageHeader } from "../../../shared/components/PageHeader";
import { PrimaryButton, SelectField } from "../../../shared/components/Controls";
import { ErrorState, LoadingState } from "../../../shared/components/Feedback";

export function RequestLeavePage() {
  const [typeId, setTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const navigate = useNavigate();
  const cache = useQueryClient();
  const types = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => api<LeaveType[]>("/leave-types"),
  });
  const canPreview = !!typeId && !!startDate && !!endDate && startDate <= endDate;
  const preview = useQuery({
    queryKey: ["leave-preview", typeId, startDate, endDate],
    enabled: canPreview,
    retry: false,
    queryFn: () =>
      api<{ requestedDays: number; approverId: string; balance: LeaveBalance | null; }>(
        `/me/leave/preview?${new URLSearchParams({
          leaveTypeId: typeId,
          startDate,
          endDate,
        })}`,
      ),
  });
  const mutation = useMutation({
    mutationFn: () =>
      api<{ id: string; }>("/me/leave/requests", {
        method: "POST",
        idempotent: true,
        body: { leaveTypeId: typeId, startDate, endDate, note },
      }),
    onSuccess: async (result) => {
      await cache.invalidateQueries({ queryKey: ["my-leave"] });
      navigate(`/app/me/leave/${result.id}`);
    },
  });
  return (
    <div className="page-fade narrow-page">
      <Link className="back-link" to="/app/me/leave">
        <ArrowLeft size={16} /> My leave
      </Link>
      <PageHeader
        eyebrow="MY WORKSPACE / TIME OFF"
        title="Request leave"
        description="Choose your dates and we'll calculate working days for you."
      />
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <section className="panel panel-pad">
          <h2 className="form-section-title">Leave details</h2>
          <div className="form-stack">
            <SelectField
              label="Leave type"
              value={typeId}
              required
              onChange={(e) => setTypeId(e.target.value)}
              options={[
                { value: "", label: "Select a leave type" },
                ...(types.data ?? []).map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Start date</span>
                <input
                  className="input"
                  type="date"
                  value={startDate}
                  required
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">End date</span>
                <input
                  className="input"
                  type="date"
                  value={endDate}
                  min={startDate}
                  required
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span className="field-label">Note (optional)</span>
              <textarea
                className="input"
                rows={4}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add context for your approver"
              />
            </label>
          </div>
        </section>
        <section className="panel panel-pad">
          <div className="section-overline">
            <CalendarDays size={16} /> REQUEST SUMMARY
          </div>
          {!canPreview ? (
            <p className="muted-text">
              Select a leave type and date range to preview your request.
            </p>
          ) : preview.isLoading ? (
            <LoadingState label="Calculating working days..." />
          ) : preview.error ? (
            <ErrorState error={preview.error} />
          ) : (
            preview.data && (
              <div className="summary-lines">
                <div>
                  <span>Working days</span>
                  <strong>{preview.data.requestedDays} days</strong>
                </div>
                <div>
                  <span>Available annual leave</span>
                  <strong>
                    {preview.data.balance
                      ? `${preview.data.balance.available} days`
                      : "Not applicable"}
                  </strong>
                </div>
                <div>
                  <span>Approver</span>
                  <strong>Assigned automatically by PeopleOps</strong>
                </div>
              </div>
            )
          )}
        </section>
        {mutation.error && <ErrorState error={mutation.error} />}
        <div className="form-actions">
          <Link className="btn btn-secondary" to="/app/me/leave">
            Cancel
          </Link>
          <PrimaryButton
            type="submit"
            disabled={!preview.data || preview.isError || mutation.isPending}
          >
            {mutation.isPending ? "Submitting..." : "Submit request"}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
