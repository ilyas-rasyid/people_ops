import type { Route } from "../../../commons/routing/router";
import { db } from "../../../database/client";
import { company, isoDate, localParts } from "../../../commons/dates";
import { actor } from "../../../commons/routing/router";
import { annualBalance } from "../../leave/service/leave.service";
import { attendanceState } from "../../attendance/service/attendance.service";
export const getDashboard: Route["handler"] = async (ctx) => {
  const session = actor(ctx);
  const settings = await company();
  const today = localParts(new Date(), settings.timezone).date;
  if (session.user.role === "HR_ADMIN") {
    const [employees, departments, pending, present] = await Promise.all([
      db.employee.count({ where: { status: "ACTIVE" } }),
      db.department.count({ where: { status: "ACTIVE" } }),
      db.leaveRequest.count({ where: { status: "PENDING" } }),
      db.attendanceRecord.count({
        where: { workDate: isoDate(today), clockInAt: { not: null } },
      }),
    ]);
    return {
      role: "HR_ADMIN",
      company: settings.name,
      today,
      metrics: [
        { label: "Active employees", value: employees },
        { label: "Departments", value: departments },
        { label: "Clocked in today", value: present },
        { label: "Pending requests", value: pending },
      ],
      recentRequests: await db.leaveRequest.findMany({
        where: { status: "PENDING" },
        include: { employee: { select: { fullName: true } }, leaveType: true },
        take: 5,
        orderBy: { submittedAt: "desc" },
      }),
    };
  }
  if (session.user.role === "MANAGER") {
    const ids = (
      await db.employee.findMany({
        where: { managerId: session.user.employeeId },
        select: { id: true },
      })
    ).map((item) => item.id);
    const [pending, present] = await Promise.all([
      db.leaveRequest.count({ where: { approverId: session.userId, status: "PENDING" } }),
      db.attendanceRecord.count({
        where: { employeeId: { in: ids }, workDate: isoDate(today), clockInAt: { not: null } },
      }),
    ]);
    return {
      role: "MANAGER",
      company: settings.name,
      today,
      metrics: [
        { label: "Direct reports", value: ids.length },
        { label: "Team clocked in", value: present },
        { label: "Pending approvals", value: pending },
      ],
    };
  }
  const balance = await annualBalance(session.user.employeeId, Number(today.slice(0, 4)));
  const attendance = await attendanceState(session.user.employeeId, today);
  const pending = await db.leaveRequest.count({
    where: {
      employeeId: session.user.employeeId,
      status: "PENDING",
    },
  });
  return {
    role: "EMPLOYEE",
    company: settings.name,
    today,
    attendance,
    balance,
    metrics: [
      { label: "Available leave days", value: balance.available },
      { label: "Pending requests", value: pending },
    ],
  };
};
