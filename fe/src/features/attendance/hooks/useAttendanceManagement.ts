import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../shared/api/client";
import type { AttendanceRow, Employee, PageResult } from "../../../shared/types/domain";

export function useAttendanceManagement(team: boolean) {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AttendanceRow | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [clockInAt, setClockInAt] = useState("");
  const [clockOutAt, setClockOutAt] = useState("");
  const [reason, setReason] = useState("");
  const cache = useQueryClient();
  const path = team ? "/team/attendance" : "/attendance";

  const records = useQuery({
    queryKey: [path, status, page],
    queryFn: () =>
      api<PageResult<AttendanceRow>>(
        `${path}?${new URLSearchParams({ status, page: String(page), pageSize: "20" })}`,
      ),
  });

  const employees = useQuery({
    queryKey: ["employees", "attendance-picker"],
    enabled: !team,
    queryFn: () => api<PageResult<Employee>>("/employees?pageSize=100"),
  });

  const correction = useMutation({
    mutationFn: () =>
      api("/attendance/corrections", {
        method: "POST",
        idempotent: true,
        body: {
          employeeId,
          workDate,
          clockInAt: clockInAt ? new Date(clockInAt).toISOString() : null,
          clockOutAt: clockOutAt ? new Date(clockOutAt).toISOString() : null,
          reason,
          ...(selected?.record ? { expectedVersion: selected.record.version } : {}),
        },
      }),
    onSuccess: () => {
      setSelected(null);
      setEmployeeId("");
      setReason("");
      void cache.invalidateQueries({ queryKey: [path] });
    },
  });

  function openCorrection(row: AttendanceRow | null) {
    setSelected(row);
    setEmployeeId(row?.employee.id ?? "");
    setWorkDate(row?.date ?? "");
    setClockInAt(row?.record?.clockInAt ? row.record.clockInAt.slice(0, 16) : "");
    setClockOutAt(row?.record?.clockOutAt ? row.record.clockOutAt.slice(0, 16) : "");
    setReason("");
  }

  function changeStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  return {
    records,
    employees,
    correction,
    status,
    page,
    selected,
    employeeId,
    workDate,
    clockInAt,
    clockOutAt,
    reason,
    setPage,
    changeStatus,
    openCorrection,
    closeCorrection: () => setSelected(null),
    setEmployeeId,
    setWorkDate,
    setClockInAt,
    setClockOutAt,
    setReason,
  };
}

export type AttendanceManagementState = ReturnType<typeof useAttendanceManagement>;
