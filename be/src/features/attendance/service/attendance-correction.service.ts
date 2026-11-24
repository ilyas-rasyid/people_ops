import { correctionSchema } from "../payload/attendance.schema";
import type { Route } from "../../../commons/routing/router";

import { db } from "../../../database/client";
import { company, isoDate, localParts, workdays } from "../../../commons/dates";
import { parse, reason } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor } from "../../../commons/routing/router";

export const correctAttendance: Route["handler"] = async (ctx) => {
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
};
