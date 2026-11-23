import { db } from "../../../database/client";
import type { Prisma } from "../../../generated/prisma/client";
import { company, dateKey, isoDate, workdays } from "../../../commons/dates";
import { invariant } from "../../../commons/errors/app-error";
import { calculateAnnualBalance } from "../policy/leave-balance.policy";

export async function lockEmployee(tx: Prisma.TransactionClient, employeeId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Employee" WHERE "id" = ${employeeId} FOR UPDATE`;
}

export async function eligibleApprover(employeeId: string) {
  const employee = await db.employee.findUniqueOrThrow({
    where: { id: employeeId },
    include: { manager: { include: { user: true } } },
  });
  const manager = employee.manager;
  if (
    manager?.status === "ACTIVE" &&
    manager.user?.status === "ACTIVE" &&
    ["MANAGER", "HR_ADMIN"].includes(manager.user.role) &&
    manager.id !== employeeId
  )
    return manager.user.id;
  const fallback = await db.user.findFirst({
    where: {
      role: "HR_ADMIN",
      status: "ACTIVE",
      employeeId: { not: employeeId },
      employee: { status: "ACTIVE" },
    },
    orderBy: { createdAt: "asc" },
  });
  invariant(
    fallback,
    422,
    "LEAVE_NO_ELIGIBLE_APPROVER",
    "There is no eligible approver available.",
  );
  return fallback.id;
}

export async function annualBalance(
  employeeId: string,
  year: number,
  client: Prisma.TransactionClient = db,
) {
  const annual = await client.leaveType.findUnique({ where: { code: "ANNUAL" } });
  const entitlement = annual
    ? await client.leaveEntitlement.findUnique({
        where: {
          employeeId_leaveTypeId_year: { employeeId, leaveTypeId: annual.id, year },
        },
      })
    : null;
  if (!entitlement)
    return {
      entitlementId: null,
      allocated: 0,
      netUsed: 0,
      officialRemaining: 0,
      reserved: 0,
      available: 0,
    };
  const [events, reservations] = await Promise.all([
    client.leaveBalanceLedger.findMany({ where: { entitlementId: entitlement.id } }),
    client.leaveReservation.findMany({
      where: { entitlementId: entitlement.id, status: "ACTIVE" },
    }),
  ]);
  return { entitlementId: entitlement.id, ...calculateAnnualBalance(events, reservations) };
}

export async function leavePreview(employeeId: string, typeId: string, start: string, end: string) {
  const settings = await company();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  invariant(start > today, 422, "LEAVE_INVALID_DATE_RANGE", "Leave must start tomorrow or later.");
  invariant(
    start <= end && start.slice(0, 4) === end.slice(0, 4),
    422,
    "LEAVE_INVALID_DATE_RANGE",
    "Leave must fit within one calendar year.",
  );
  const employee = await db.employee.findUniqueOrThrow({ where: { id: employeeId } });
  invariant(
    employee.status === "ACTIVE" && start >= dateKey(employee.joinDate),
    422,
    "LEAVE_INVALID_DATE_RANGE",
    "The selected date is outside your employment period.",
  );
  const leaveType = await db.leaveType.findUniqueOrThrow({ where: { id: typeId } });
  invariant(leaveType.status === "ACTIVE", 422, "INVALID_LEAVE_TYPE", "Leave type is not active.");
  const days = await workdays(start, end);
  invariant(days.length > 0, 422, "LEAVE_INVALID_DATE_RANGE", "Choose a range with working days.");
  const overlap = await db.leaveRequest.findFirst({
    where: {
      employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: isoDate(end) },
      endDate: { gte: isoDate(start) },
    },
  });
  invariant(
    !overlap,
    409,
    "LEAVE_DATE_OVERLAP",
    "The requested range overlaps another leave request.",
  );
  const balance = leaveType.deductsBalance
    ? await annualBalance(employeeId, Number(start.slice(0, 4)))
    : null;
  if (balance)
    invariant(
      balance.available >= days.length,
      422,
      "LEAVE_INSUFFICIENT_BALANCE",
      "You do not have enough available annual leave days.",
    );
  const approverId = await eligibleApprover(employeeId);
  return { days, requestedDays: days.length, balance, approverId, leaveType };
}

export async function submitLeave(
  employeeId: string,
  actorId: string,
  typeId: string,
  start: string,
  end: string,
  note: string | undefined,
  requestId: string,
) {
  const preview = await leavePreview(employeeId, typeId, start, end);
  return db.$transaction(async (tx) => {
    await lockEmployee(tx, employeeId);
    const currentEmployee = await tx.employee.findUniqueOrThrow({ where: { id: employeeId } });
    invariant(
      currentEmployee.status === "ACTIVE",
      409,
      "EMPLOYEE_INACTIVE",
      "Employee status changed before leave submission.",
    );
    const overlap = await tx.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: isoDate(end) },
        endDate: { gte: isoDate(start) },
      },
    });
    invariant(!overlap, 409, "LEAVE_DATE_OVERLAP", "A competing leave request already exists.");
    const balance = preview.leaveType.deductsBalance
      ? await annualBalance(employeeId, Number(start.slice(0, 4)), tx)
      : null;
    if (balance)
      invariant(
        balance.entitlementId && balance.available >= preview.requestedDays,
        422,
        "LEAVE_INSUFFICIENT_BALANCE",
        "Available leave was changed by another request.",
      );
    const created = await tx.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: typeId,
        startDate: isoDate(start),
        endDate: isoDate(end),
        requestedDays: preview.requestedDays,
        note,
        approverId: preview.approverId,
        days: { create: preview.days.map((date) => ({ date: isoDate(date) })) },
      },
    });
    if (balance?.entitlementId)
      await tx.leaveReservation.create({
        data: {
          requestId: created.id,
          entitlementId: balance.entitlementId,
          reservedDays: preview.requestedDays,
        },
      });
    await tx.auditLog.create({
      data: {
        actorId,
        eventType: "LEAVE_SUBMITTED",
        resource: "LeaveRequest",
        resourceId: created.id,
        requestId,
      },
    });
    return created;
  });
}
