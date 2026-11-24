import { db } from "../../../database/client";
import { company, dateKey, workdays } from "../../../commons/dates";
import { invariant } from "../../../commons/errors/app-error";
import { annualBalance, lockEmployee } from "./leave.service";

export async function decideLeave(
  requestId: string,
  actorId: string,
  role: string,
  action: "approve" | "reject",
  reason: string | undefined,
  correlationId: string,
) {
  const initial = await db.leaveRequest.findUniqueOrThrow({ where: { id: requestId } });
  invariant(
    ["MANAGER", "HR_ADMIN"].includes(role),
    403,
    "PERMISSION_DENIED",
    "Only authorized approvers may decide leave requests.",
  );
  const self = await db.user.findUniqueOrThrow({ where: { id: actorId } });
  invariant(
    self.employeeId !== initial.employeeId,
    403,
    "SELF_APPROVAL_FORBIDDEN",
    "You cannot decide your own leave request.",
  );
  invariant(
    initial.approverId === actorId || role === "HR_ADMIN",
    403,
    "PERMISSION_DENIED",
    "You are not assigned to this request.",
  );
  const override = initial.approverId !== actorId;
  invariant(
    !override || (reason && reason.length >= 3),
    422,
    "REASON_REQUIRED",
    "HR override requires a reason.",
  );
  invariant(
    action !== "reject" || (reason && reason.length >= 3),
    422,
    "REASON_REQUIRED",
    "Please explain the rejection.",
  );
  if (action === "approve") {
    const currentDays = await workdays(dateKey(initial.startDate), dateKey(initial.endDate));
    const originalDays = await db.leaveRequestDay.findMany({
      where: { requestId },
      orderBy: { date: "asc" },
    });
    invariant(
      originalDays.length === currentDays.length &&
      originalDays.every((day, index) => dateKey(day.date) === currentDays[index]),
      409,
      "LEAVE_CALENDAR_CHANGED",
      "Working days changed. Submit a new request.",
    );
  }
  return db.$transaction(async (tx) => {
    await lockEmployee(tx, initial.employeeId);
    const request = await tx.leaveRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { reservation: true },
    });
    invariant(
      request.status === "PENDING",
      409,
      "LEAVE_ALREADY_FINALIZED",
      "This leave request has already been processed.",
    );
    if (action === "approve" && request.reservation) {
      const balance = await annualBalance(
        request.employeeId,
        request.startDate.getUTCFullYear(),
        tx,
      );
      invariant(
        balance.entitlementId && balance.officialRemaining >= request.requestedDays,
        422,
        "LEAVE_INSUFFICIENT_BALANCE",
        "Insufficient balance to approve this request.",
      );
      await tx.leaveBalanceLedger.create({
        data: {
          entitlementId: request.reservation.entitlementId,
          requestId,
          eventType: "DEBIT",
          deltaDays: -request.requestedDays,
          eventKey: `approve:${requestId}`,
          actorId,
        },
      });
    }
    if (request.reservation)
      await tx.leaveReservation.update({
        where: { requestId },
        data: {
          status: action === "approve" ? "CONSUMED" : "RELEASED",
          resolvedAt: new Date(),
        },
      });
    const updated = await tx.leaveRequest.update({
      where: { id: requestId, version: request.version },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        decidedAt: new Date(),
        decidedById: actorId,
        decisionReason: reason ?? null,
        version: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        eventType: action === "approve" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
        resource: "LeaveRequest",
        resourceId: requestId,
        reason: reason ?? null,
        requestId: correlationId,
      },
    });
    return updated;
  });
}

export async function cancelLeave(
  requestId: string,
  actorId: string,
  role: string,
  reason: string | undefined,
  correlationId: string,
) {
  const initial = await db.leaveRequest.findUniqueOrThrow({ where: { id: requestId } });
  const user = await db.user.findUniqueOrThrow({ where: { id: actorId } });
  const owner = user.employeeId === initial.employeeId;
  invariant(
    initial.status === "PENDING" ? owner : role === "HR_ADMIN",
    403,
    "PERMISSION_DENIED",
    "You cannot cancel this request.",
  );
  invariant(
    ["PENDING", "APPROVED"].includes(initial.status),
    409,
    "LEAVE_ALREADY_FINALIZED",
    "This request cannot be cancelled.",
  );
  if (initial.status === "APPROVED") {
    invariant(
      reason && reason.length >= 3,
      422,
      "REASON_REQUIRED",
      "HR cancellation requires an explanation.",
    );
    const settings = await company();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: settings.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    invariant(
      dateKey(initial.startDate) > today,
      409,
      "LEAVE_ALREADY_STARTED",
      "Leave that has started cannot be cancelled.",
    );
  }
  return db.$transaction(async (tx) => {
    await lockEmployee(tx, initial.employeeId);
    const request = await tx.leaveRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { reservation: true },
    });
    invariant(
      request.status === initial.status,
      409,
      "VERSION_CONFLICT",
      "Request changed. Refresh first.",
    );
    if (request.reservation && request.status === "PENDING") {
      await tx.leaveReservation.update({
        where: { requestId },
        data: {
          status: "RELEASED",
          resolvedAt: new Date(),
        },
      });
    }
    if (request.reservation && request.status === "APPROVED") {
      await tx.leaveBalanceLedger.create({
        data: {
          entitlementId: request.reservation.entitlementId,
          requestId,
          eventType: "REFUND",
          deltaDays: request.requestedDays,
          eventKey: `cancel-approved:${requestId}`,
          actorId,
        },
      });
    }
    const result = await tx.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        cancelledById: actorId,
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
        version: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        eventType: "LEAVE_CANCELLED",
        resource: "LeaveRequest",
        resourceId: requestId,
        reason: reason ?? null,
        requestId: correlationId,
      },
    });
    return result;
  });
}
