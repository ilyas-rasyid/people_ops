import { db } from "./client";

// Operator may schedule this command before and after year rollover.
// The unique entitlement and event keys make repeated runs safe.
async function provision() {
  const settings = await db.companySettings.findFirstOrThrow();
  const year = Number(
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      timeZone: settings.timezone,
    }).format(new Date()),
  );
  const annual = await db.leaveType.findUniqueOrThrow({ where: { code: "ANNUAL" } });
  const employees = await db.employee.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  for (const employee of employees) {
    await db.$transaction(async (tx) => {
      const entitlement = await tx.leaveEntitlement.upsert({
        where: {
          employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: annual.id, year },
        },
        create: { employeeId: employee.id, leaveTypeId: annual.id, year },
        update: {},
      });
      await tx.leaveBalanceLedger.upsert({
        where: { eventKey: `grant:${employee.id}:${year}` },
        create: {
          eventKey: `grant:${employee.id}:${year}`,
          entitlementId: entitlement.id,
          eventType: "GRANT",
          deltaDays: settings.defaultAnnualDays,
        },
        update: {},
      });
    });
  }
  console.info(
    `Annual entitlement provisioning verified for ${employees.length} employees (${year}).`,
  );
}

provision()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
