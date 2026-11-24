import { db } from "../../../database/client";
import { company, dateKey, isoDate, localParts, scheduleFor, workdays } from "../../../commons/dates";
import { invariant } from "../../../commons/errors/app-error";

export async function todayContext() {
  const settings = await company();
  const current = localParts(new Date(), settings.timezone);
  return { date: current.date, time: current.time, settings };
}

export async function attendanceState(employeeId: string, date: string) {
  const record = await db.attendanceRecord.findUnique({
    where: {
      employeeId_workDate: { employeeId, workDate: isoDate(date) },
    },
  });
  const working = (await workdays(date, date)).length > 0;
  const approvedLeave = await db.leaveRequest.findFirst({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: isoDate(date) },
      endDate: { gte: isoDate(date) },
    },
  });
  let status = "NOT_STARTED";
  if (!working) status = "NON_WORKING_DAY";
  if (approvedLeave) status = "ON_LEAVE";
  if (record?.clockInAt) {
    if (!record.clockOutAt) status = "INCOMPLETE";
    else {
      const schedule = await scheduleFor(date);
      const timezone = (await company()).timezone;
      const clock = localParts(record.clockInAt, timezone).time;
      const [hour = 0, minute = 0] = (record.startTimeSnapshot ?? schedule?.startTime ?? "09:00")
        .split(":")
        .map(Number);
      const grace = record.graceMinutesSnapshot ?? schedule?.graceMinutes ?? 0;
      status =
        Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5)) > hour * 60 + minute + grace
          ? "LATE"
          : "PRESENT";
    }
  }
  if (!record && working && !approvedLeave && date < (await todayContext()).date) status = "ABSENT";
  return { date, status, record };
}

export async function clock(employeeId: string, action: "in" | "out") {
  const { date, settings } = await todayContext();
  const employee = await db.employee.findUniqueOrThrow({ where: { id: employeeId } });
  invariant(
    employee.status === "ACTIVE" && dateKey(employee.joinDate) <= date,
    422,
    "ATTENDANCE_NOT_ALLOWED",
    "Attendance is unavailable for this employee.",
  );
  invariant(
    (await workdays(date, date)).length > 0,
    422,
    "ATTENDANCE_NOT_ALLOWED",
    "Attendance is not available on non-working days.",
  );
  const leave = await db.leaveRequest.findFirst({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: isoDate(date) },
      endDate: { gte: isoDate(date) },
    },
  });
  invariant(!leave, 422, "ATTENDANCE_NOT_ALLOWED", "Approved leave prevents attendance today.");
  const schedule = await scheduleFor(date);
  invariant(schedule, 422, "ATTENDANCE_NOT_ALLOWED", "No work schedule is configured.");
  const now = new Date();
  if (action === "in") {
    const result = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Employee" WHERE "id" = ${employeeId} FOR UPDATE`;
      const currentEmployee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
      invariant(
        currentEmployee.status === "ACTIVE",
        422,
        "ATTENDANCE_NOT_ALLOWED",
        "Employee status changed before attendance was recorded.",
      );
      const conflict = await tx.leaveRequest.findFirst({
        where: {
          employeeId,
          status: "APPROVED",
          startDate: { lte: isoDate(date) },
          endDate: { gte: isoDate(date) },
        },
      });
      invariant(!conflict, 422, "ATTENDANCE_NOT_ALLOWED", "Approved leave prevents clock-in.");
      return tx.attendanceRecord.create({
        data: {
          employeeId,
          workDate: isoDate(date),
          clockInAt: now,
          scheduleId: schedule.id,
          startTimeSnapshot: schedule.startTime,
          graceMinutesSnapshot: schedule.graceMinutes,
        },
      });
    });
    return { ...result, status: (await attendanceState(employeeId, date)).status };
  }
  const current = await db.attendanceRecord.findUnique({
    where: {
      employeeId_workDate: { employeeId, workDate: isoDate(date) },
    },
  });
  invariant(
    current?.clockInAt && !current.clockOutAt,
    409,
    "ATTENDANCE_NOT_OPEN",
    "There is no open attendance to complete.",
  );
  invariant(
    localParts(now, settings.timezone).date === date && now > current.clockInAt,
    422,
    "ATTENDANCE_NOT_ALLOWED",
    "Clock-out must occur after clock-in on the same local day.",
  );
  const affected = await db.attendanceRecord.updateMany({
    where: {
      id: current.id,
      clockOutAt: null,
      version: current.version,
    },
    data: { clockOutAt: now, version: { increment: 1 } },
  });
  invariant(
    affected.count === 1,
    409,
    "ATTENDANCE_NOT_OPEN",
    "Attendance has already been completed.",
  );
  return attendanceState(employeeId, date);
}
