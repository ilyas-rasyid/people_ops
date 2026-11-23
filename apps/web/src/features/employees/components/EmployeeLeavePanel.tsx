import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/client";
import type { Employee, LeaveBalance } from "../../../shared/types/domain";
import { ErrorState, LoadingState } from "../../../shared/components/Feedback";
import { PrimaryButton, TextField } from "../../../shared/components/Controls";
import { LeaveBalanceSummary } from "../../leave/components/LeaveBalanceSummary";

export function EmployeeLeavePanel({ employee }: { employee: Employee }) {
  const [days, setDays] = useState(0);
  const [reason, setReason] = useState("");
  const year = new Date().getFullYear();
  const cache = useQueryClient();
  const balance = useQuery({
    queryKey: ["employee-balance", employee.id],
    queryFn: () => api<LeaveBalance>(`/employees/${employee.id}/leave/balance?year=${year}`),
  });
  const adjust = useMutation({
    mutationFn: () =>
      api(`/employees/${employee.id}/leave/entitlements/${year}/adjustments`, {
        method: "POST",
        idempotent: true,
        body: { deltaDays: days, reason },
      }),
    onSuccess: () => {
      setDays(0);
      setReason("");
      void cache.invalidateQueries({ queryKey: ["employee-balance", employee.id] });
    },
  });
  return (
    <div className="form-stack panel-pad">
      <h2 className="form-section-title">Annual leave · {year}</h2>
      {balance.isLoading ? (
        <LoadingState />
      ) : balance.error ? (
        <ErrorState error={balance.error} />
      ) : (
        balance.data && <LeaveBalanceSummary balance={balance.data} />
      )}
      <div className="subtle-divider" />
      <h3 className="form-section-title">Adjust annual leave</h3>
      <p className="muted-text">Adjustments are recorded permanently in the balance ledger.</p>
      <div className="form-grid">
        <TextField
          label="Days to add or deduct"
          type="number"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        />
        <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {adjust.error && <ErrorState error={adjust.error} />}
      <div className="form-actions">
        <PrimaryButton
          disabled={!days || reason.trim().length < 3 || adjust.isPending}
          onClick={() => adjust.mutate()}
        >
          Save adjustment
        </PrimaryButton>
      </div>
    </div>
  );
}
