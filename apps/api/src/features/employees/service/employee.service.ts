import { db } from "../../../database/client";
import { isoDate } from "../../../commons/dates";
import { invariant } from "../../../commons/errors/app-error";
import type { z } from "zod";
import type { employeeCreate, employeeUpdate } from "../schema/employee.schema";

export const employeeInclude = {
  department: true,
  position: true,
  manager: {
    select: { id: true, fullName: true, employeeCode: true },
  },
} as const;

export async function verifyPlacement(
  departmentId: string,
  positionId: string,
  managerId?: string | null,
  ownId?: string,
) {
  const [department, position] = await Promise.all([
    db.department.findFirst({ where: { id: departmentId, status: "ACTIVE" } }),
    db.position.findFirst({ where: { id: positionId, status: "ACTIVE" } }),
  ]);
  invariant(
    department && position,
    422,
    "INVALID_PLACEMENT",
    "Select an active department and position.",
  );
  if (!managerId) return;
  invariant(
    managerId !== ownId,
    422,
    "MANAGER_HIERARCHY_CYCLE",
    "An employee cannot manage themselves.",
  );
  const manager = await db.employee.findUnique({
    where: { id: managerId },
    include: { user: true },
  });
  invariant(
    manager?.status === "ACTIVE" &&
      manager.user?.status === "ACTIVE" &&
      ["MANAGER", "HR_ADMIN"].includes(manager.user.role),
    422,
    "INVALID_MANAGER_ASSIGNMENT",
    "Select an active manager with manager access.",
  );
  let ancestor = manager.managerId;
  const visited = new Set([managerId]);
  while (ancestor) {
    invariant(
      !visited.has(ancestor) && ancestor !== ownId,
      422,
      "MANAGER_HIERARCHY_CYCLE",
      "Manager assignment would create a cycle.",
    );
    visited.add(ancestor);
    ancestor =
      (await db.employee.findUnique({ where: { id: ancestor }, select: { managerId: true } }))
        ?.managerId ?? null;
  }
}

export async function createEmployee(
  data: z.infer<typeof employeeCreate>,
  actorId: string,
  requestId: string,
) {
  const email = data.workEmail.trim().toLowerCase();
  await verifyPlacement(data.departmentId, data.positionId, data.managerId);
  const password = data.createAccount ? crypto.randomUUID() + "!aA1" : null;
  const passwordHash = password
    ? await Bun.password.hash(password, { algorithm: "argon2id" })
    : null;
  const employee = await db.$transaction(async (tx) => {
    const created = await tx.employee.create({
      data: {
        employeeCode: data.employeeCode,
        fullName: data.fullName,
        workEmail: email,
        joinDate: isoDate(data.joinDate),
        phoneNumber: data.phoneNumber,
        departmentId: data.departmentId,
        positionId: data.positionId,
        managerId: data.managerId,
      },
    });
    if (passwordHash)
      await tx.user.create({
        data: {
          employeeId: created.id,
          passwordHash,
          role: data.accountRole ?? "EMPLOYEE",
          mustChangePassword: true,
          credentialExpiresAt: new Date(Date.now() + 48 * 3600_000),
        },
      });
    await tx.employmentRecord.create({
      data: {
        employeeId: created.id,
        eventType: "JOINED",
        actorId,
        after: { employeeCode: created.employeeCode },
      },
    });
    const annual = await tx.leaveType.findUnique({ where: { code: "ANNUAL" } });
    const settings = await tx.companySettings.findFirst();
    if (annual && settings) {
      const entitlement = await tx.leaveEntitlement.create({
        data: {
          employeeId: created.id,
          leaveTypeId: annual.id,
          year: new Date().getUTCFullYear(),
        },
      });
      await tx.leaveBalanceLedger.create({
        data: {
          entitlementId: entitlement.id,
          eventType: "GRANT",
          deltaDays: settings.defaultAnnualDays,
          eventKey: `grant:${created.id}:${new Date().getUTCFullYear()}`,
        },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId,
        eventType: "EMPLOYEE_CREATED",
        resource: "Employee",
        resourceId: created.id,
        requestId,
      },
    });
    return created;
  });
  return { ...employee, temporaryPassword: password };
}

export async function updateEmployee(
  id: string,
  data: z.infer<typeof employeeUpdate>,
  actorId: string,
  requestId: string,
) {
  const current = await db.employee.findUniqueOrThrow({ where: { id } });
  invariant(
    current.version === data.expectedVersion,
    409,
    "VERSION_CONFLICT",
    "Employee details changed. Refresh first.",
  );
  await verifyPlacement(
    data.departmentId ?? current.departmentId,
    data.positionId ?? current.positionId,
    data.managerId === undefined ? current.managerId : data.managerId,
    id,
  );
  const { expectedVersion, ...changes } = data;
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.employee.update({
      where: { id, version: expectedVersion },
      data: {
        ...changes,
        workEmail: changes.workEmail?.trim().toLowerCase(),
        version: { increment: 1 },
      },
    });
    await tx.employmentRecord.create({
      data: {
        employeeId: id,
        eventType: "UPDATED",
        actorId,
        before: {
          departmentId: current.departmentId,
          positionId: current.positionId,
          managerId: current.managerId,
        },
        after: {
          departmentId: result.departmentId,
          positionId: result.positionId,
          managerId: result.managerId,
        },
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        eventType: "EMPLOYEE_UPDATED",
        resource: "Employee",
        resourceId: id,
        requestId,
      },
    });
    if (changes.workEmail && changes.workEmail.toLowerCase() !== current.workEmail) {
      const user = await tx.user.findUnique({ where: { employeeId: id } });
      if (user)
        await tx.session.updateMany({
          where: { userId: user.id },
          data: { revokedAt: new Date() },
        });
    }
    return result;
  });
  return updated;
}
