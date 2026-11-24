import type { Route } from "../../../commons/routing/router";
import { db } from "../../../database/client";
import { company, dateKey, isoDate, localParts } from "../../../commons/dates";
import { parse, pageQuery, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor } from "../../../commons/routing/router";
import { attendanceState } from "../service/attendance.service";

async function queryAttendanceList(employeeId: string | undefined, query: URLSearchParams) {
  const { page, pageSize } = pageQuery(query);
  const settings = await company();
  const to = query.get("to") || localParts(new Date(), settings.timezone).date;
  const from = query.get("from") || dateKey(new Date(isoDate(to).getTime() - 13 * 86400_000));
  invariant(
    from <= to && (isoDate(to).getTime() - isoDate(from).getTime()) / 86400_000 <= 93,
    422,
    "INVALID_DATE_RANGE",
    "Select a date range of at most 94 days.",
  );
  const current = new Date(isoDate(to));
  const dates: string[] = [];
  while (current >= isoDate(from)) {
    dates.push(dateKey(current));
    current.setUTCDate(current.getUTCDate() - 1);
  }
  const employees = employeeId
    ? [await db.employee.findUniqueOrThrow({ where: { id: employeeId } })]
    : await db.employee.findMany({
      where: { status: "ACTIVE" },
      take: 500,
      orderBy: { fullName: "asc" },
    });
  const all = await Promise.all(
    employees.flatMap((employee) =>
      dates.map(async (date) => ({
        employee: {
          id: employee.id,
          fullName: employee.fullName,
          employeeCode: employee.employeeCode,
        },
        ...(await attendanceState(employee.id, date)),
      })),
    ),
  );
  const statusFilter = query.get("status");
  const filtered = statusFilter ? all.filter((row) => row.status === statusFilter) : all;
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export const getTodayAttendance: Route["handler"] = async (ctx) => {
  const settings = await company();
  const today = localParts(new Date(), settings.timezone).date;
  return {
    ...(await attendanceState(actor(ctx).user.employeeId, today)),
    timezone: settings.timezone,
  };
};

export const getMyAttendance: Route["handler"] = async (ctx) =>
  queryAttendanceList(actor(ctx).user.employeeId, ctx.query);

export const listAttendance: Route["handler"] = async (ctx) => {
  const employeeId = ctx.query.get("employeeId") || undefined;
  return queryAttendanceList(employeeId, ctx.query);
};

export const listTeamAttendance: Route["handler"] = async (ctx) => {
  const managerId = actor(ctx).user.employeeId;
  const employeeId = ctx.query.get("employeeId");
  if (employeeId) {
    const employee = await db.employee.findFirst({ where: { id: employeeId, managerId } });
    invariant(employee, 404, "RESOURCE_NOT_FOUND", "Employee not found.");
    return queryAttendanceList(employeeId, ctx.query);
  }
  const members = await db.employee.findMany({ where: { managerId }, select: { id: true } });
  const results = await Promise.all(
    members.map((member) => queryAttendanceList(member.id, ctx.query)),
  );
  return {
    items: results.flatMap((result) => result.items),
    total: results.reduce((n, r) => n + r.total, 0),
  };
};

export const getAttendanceDetail: Route["handler"] = async (ctx) =>
  db.attendanceRecord.findUniqueOrThrow({
    where: { id: parse(uuid, ctx.params.id) },
    include: { employee: { select: { fullName: true, employeeCode: true } } },
  });

export const listAttendanceAdjustments: Route["handler"] = async (ctx) =>
  db.attendanceAdjustment.findMany({
    where: { attendanceId: parse(uuid, ctx.params.id) },
    orderBy: { createdAt: "desc" },
  });
