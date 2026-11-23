import { z } from "zod";
import { db } from "../../../database/client";
import { company, dateKey, isoDate, localParts, workdays } from "../../../commons/dates";
import { parse, pageQuery, dateOnly, reason, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor, route } from "../../../commons/routing/router";
import { clock, attendanceState } from "../service/attendance.service";

const correctionSchema = z.strictObject({
  employeeId: uuid,
  workDate: dateOnly,
  clockInAt: z.iso.datetime({ offset: true }).nullable(),
  clockOutAt: z.iso.datetime({ offset: true }).nullable(),
  reason,
  expectedVersion: z.number().int().nonnegative().optional(),
});

async function listAttendance(employeeId: string | undefined, query: URLSearchParams) {
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

export const attendanceRoutes = [
  route("GET", "/api/v1/me/attendance/today", "AUTH", async (ctx) => {
    const settings = await company();
    const today = localParts(new Date(), settings.timezone).date;
    return {
      ...(await attendanceState(actor(ctx).user.employeeId, today)),
      timezone: settings.timezone,
    };
  }),
  route("GET", "/api/v1/me/attendance", "AUTH", async (ctx) =>
    listAttendance(actor(ctx).user.employeeId, ctx.query),
  ),
  route(
    "POST",
    "/api/v1/me/attendance/clock-in",
    "AUTH",
    async (ctx) => clock(actor(ctx).user.employeeId, "in"),
    true,
  ),
  route(
    "POST",
    "/api/v1/me/attendance/clock-out",
    "AUTH",
    async (ctx) => clock(actor(ctx).user.employeeId, "out"),
    true,
  ),
  route("GET", "/api/v1/attendance", "HR", async (ctx) => {
    const employeeId = ctx.query.get("employeeId") || undefined;
    return listAttendance(employeeId, ctx.query);
  }),
  route("GET", "/api/v1/team/attendance", "MANAGER", async (ctx) => {
    const managerId = actor(ctx).user.employeeId;
    const employeeId = ctx.query.get("employeeId");
    if (employeeId) {
      const employee = await db.employee.findFirst({ where: { id: employeeId, managerId } });
      invariant(employee, 404, "RESOURCE_NOT_FOUND", "Employee not found.");
      return listAttendance(employeeId, ctx.query);
    }
    const members = await db.employee.findMany({ where: { managerId }, select: { id: true } });
    const results = await Promise.all(
      members.map((member) => listAttendance(member.id, ctx.query)),
    );
    return {
      items: results.flatMap((result) => result.items),
      total: results.reduce((n, r) => n + r.total, 0),
    };
  }),
  route("GET", "/api/v1/attendance/:id", "HR", async (ctx) =>
    db.attendanceRecord.findUniqueOrThrow({
      where: { id: parse(uuid, ctx.params.id) },
      include: { employee: { select: { fullName: true, employeeCode: true } } },
    }),
  ),
  route("GET", "/api/v1/attendance/:id/adjustments", "HR", async (ctx) =>
    db.attendanceAdjustment.findMany({
      where: { attendanceId: parse(uuid, ctx.params.id) },
      orderBy: { createdAt: "desc" },
    }),
  ),
  route(
    "POST",
    "/api/v1/attendance/corrections",
    "HR",
    async (ctx) => {
      const data = parse(correctionSchema, ctx.body);
      const clockIn = data.clockInAt ? new Date(data.clockInAt) : null;
      const clockOut = data.clockOutAt ? new Date(data.clockOutAt) : null;
      invariant(
        !(clockOut && (!clockIn || clockOut <= clockIn)),
        422,
        "INVALID_ATTENDANCE",
        "Clock-out must follow clock-in.",
      );
      const settings = await company();
      invariant(
        !clockIn || localParts(clockIn, settings.timezone).date === data.workDate,
        422,
        "INVALID_ATTENDANCE",
        "Clock-in must fall on the selected workday.",
      );
      invariant(
        !clockOut || localParts(clockOut, settings.timezone).date === data.workDate,
        422,
        "INVALID_ATTENDANCE",
        "Clock-out must fall on the selected workday.",
      );
      invariant(
        (await workdays(data.workDate, data.workDate)).length > 0,
        422,
        "INVALID_ATTENDANCE",
        "Corrections require a scheduled workday.",
      );
      const blocked = await db.leaveRequest.findFirst({
        where: {
          employeeId: data.employeeId,
          status: "APPROVED",
          startDate: { lte: isoDate(data.workDate) },
          endDate: { gte: isoDate(data.workDate) },
        },
      });
      invariant(
        !blocked,
        422,
        "ATTENDANCE_NOT_ALLOWED",
        "Approved leave conflicts with attendance on this date.",
      );
      return db.$transaction(async (tx) => {
        const existing = await tx.attendanceRecord.findUnique({
          where: {
            employeeId_workDate: {
              employeeId: data.employeeId,
              workDate: isoDate(data.workDate),
            },
          },
        });
        invariant(
          !existing || data.expectedVersion === existing.version,
          409,
          "VERSION_CONFLICT",
          "Attendance changed since you opened it.",
        );
        const record = existing
          ? await tx.attendanceRecord.update({
              where: {
                id: existing.id,
                version: existing.version,
              },
              data: {
                clockInAt: clockIn,
                clockOutAt: clockOut,
                source: "HR_CORRECTION",
                version: { increment: 1 },
              },
            })
          : await tx.attendanceRecord.create({
              data: {
                employeeId: data.employeeId,
                workDate: isoDate(data.workDate),
                clockInAt: clockIn,
                clockOutAt: clockOut,
                source: "HR_CORRECTION",
              },
            });
        await tx.attendanceAdjustment.create({
          data: {
            attendanceId: record.id,
            actorId: actor(ctx).userId,
            reason: data.reason,
            before: existing
              ? {
                  clockInAt: existing.clockInAt?.toISOString(),
                  clockOutAt: existing.clockOutAt?.toISOString(),
                }
              : {},
            after: { clockInAt: data.clockInAt, clockOutAt: data.clockOutAt },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor(ctx).userId,
            eventType: "ATTENDANCE_CORRECTED",
            resource: "AttendanceRecord",
            resourceId: record.id,
            reason: data.reason,
            requestId: ctx.requestId,
          },
        });
        return record;
      });
    },
    true,
  ),
];
