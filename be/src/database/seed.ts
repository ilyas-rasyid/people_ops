import { db } from "./client";
import { dateKey, isoDate } from "../commons/dates";

if (process.env.APP_ENV === "production") {
  throw new Error("Demo seeding is disabled in production.");
}

const firstNames = [
  "Amelia",
  "Nathan",
  "Olivia",
  "Ethan",
  "Sophia",
  "Noah",
  "Isabella",
  "Liam",
  "Ava",
  "Lucas",
  "Maya",
  "Daniel",
  "Grace",
  "Samuel",
  "Zoe",
  "Caleb",
  "Iris",
  "Henry",
];
const lastNames = [
  "Morgan",
  "Chen",
  "Patel",
  "Rivera",
  "Kim",
  "Hart",
  "Bennett",
  "Wilson",
  "Brooks",
  "Foster",
  "Park",
  "Diaz",
];
const teams = [
  "People & Culture",
  "Engineering",
  "Design",
  "Product",
  "Finance",
  "Operations",
  "Sales",
  "Customer Success",
];
const positions = [
  "HR Manager",
  "Engineering Manager",
  "Product Designer",
  "Software Engineer",
  "Product Manager",
  "Financial Analyst",
  "Operations Specialist",
  "Account Executive",
  "People Specialist",
];
const year = new Date().getFullYear();
const demoPassword = "PeopleOpsDemo!2026";

async function seed() {
  const company = await db.companySettings.findFirst();
  if (!company)
    await db.companySettings.create({
      data: { name: "Northstar Studio", timezone: "Asia/Makassar" },
    });
  const schedule = await db.workSchedule.findFirst();
  if (!schedule)
    await db.workSchedule.create({
      data: {
        effectiveFrom: isoDate(`${year - 1}-01-01`),
        workingDays: "1,2,3,4,5",
        startTime: "09:00",
        endTime: "17:00",
        graceMinutes: 10,
        timezone: "Asia/Makassar",
      },
    });
  const departmentIds: string[] = [];
  for (const name of teams) {
    const entry =
      (await db.department.findFirst({ where: { normalizedName: name.toLowerCase() } })) ??
      (await db.department.create({ data: { name, normalizedName: name.toLowerCase() } }));
    departmentIds.push(entry.id);
  }
  const positionIds: string[] = [];
  for (const title of positions) {
    const entry =
      (await db.position.findFirst({ where: { normalizedTitle: title.toLowerCase() } })) ??
      (await db.position.create({ data: { title, normalizedTitle: title.toLowerCase() } }));
    positionIds.push(entry.id);
  }
  for (const [code, name, deductsBalance] of [
    ["ANNUAL", "Annual Leave", true],
    ["UNPAID", "Unpaid Leave", false],
  ] as const) {
    await db.leaveType.upsert({
      where: { code },
      create: { code, name, deductsBalance },
      update: { name, deductsBalance },
    });
  }
  const roles = [
    { code: "NS-001", name: "Alex Morgan", role: "HR_ADMIN", dep: 0, pos: 0 },
    { code: "NS-002", name: "Jordan Chen", role: "MANAGER", dep: 1, pos: 1 },
    { code: "NS-003", name: "Taylor Brooks", role: "EMPLOYEE", dep: 1, pos: 3 },
    { code: "NS-004", name: "Avery Patel", role: "HR_ADMIN", dep: 0, pos: 8 },
  ];
  const passwordHash = await Bun.password.hash(demoPassword, { algorithm: "argon2id" });
  const employees: string[] = [];
  for (let index = 0; index < 60; index++) {
    const person = roles[index];
    const given = firstNames[index % firstNames.length];
    const family = lastNames[Math.floor(index / 3) % lastNames.length];
    const name = person?.name ?? `${given} ${family}`;
    const code = person?.code ?? `NS-${String(index + 1).padStart(3, "0")}`;
    const localEmail = index === 0 ? "hr" : index === 3 ? "hr2" : person?.role.toLowerCase();
    const employee = await db.employee.upsert({
      where: { employeeCode: code },
      create: {
        employeeCode: code,
        fullName: name,
        workEmail: person ? `${localEmail}@example.com` : `team${index + 1}@example.com`,
        departmentId: departmentIds[person?.dep ?? index % 8]!,
        positionId: positionIds[person?.pos ?? (index % 8) + 1]!,
        joinDate: isoDate(`${year - 1}-02-03`),
      },
      update: {},
    });
    employees.push(employee.id);
    if (person)
      await db.user.upsert({
        where: { employeeId: employee.id },
        create: { employeeId: employee.id, passwordHash, role: person.role },
        update: {},
      });
  }
  const managerId = employees[1]!;
  for (let index = 2; index < employees.length; index++) {
    if (index !== 3)
      await db.employee.update({ where: { id: employees[index]! }, data: { managerId } });
  }
  const annual = await db.leaveType.findUniqueOrThrow({ where: { code: "ANNUAL" } });
  for (const employeeId of employees) {
    for (const grantYear of [year, year + 1]) {
      const entitlement = await db.leaveEntitlement.upsert({
        where: {
          employeeId_leaveTypeId_year: { employeeId, leaveTypeId: annual.id, year: grantYear },
        },
        create: { employeeId, leaveTypeId: annual.id, year: grantYear },
        update: {},
      });
      await db.leaveBalanceLedger.upsert({
        where: { eventKey: `grant:${employeeId}:${grantYear}` },
        create: {
          eventKey: `grant:${employeeId}:${grantYear}`,
          entitlementId: entitlement.id,
          eventType: "GRANT",
          deltaDays: 12,
        },
        update: {},
      });
    }
  }
  const today = new Date();
  const start = new Date(today.getTime() - 30 * 86400_000);
  const rows = [];
  for (let d = 0; d < 30; d++) {
    const date = new Date(start.getTime() + d * 86400_000);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6 || date > today) continue;
    for (let index = 0; index < 55; index++) {
      if ((d * 7 + index) % 13 === 0) continue;
      const stamp = dateKey(date);
      rows.push({
        employeeId: employees[index]!,
        workDate: isoDate(stamp),
        clockInAt: new Date(`${stamp}T${(d + index) % 9 === 0 ? "01:25" : "00:55"}:00Z`),
        clockOutAt: new Date(`${stamp}T09:10:00Z`),
        startTimeSnapshot: "09:00",
        graceMinutesSnapshot: 10,
      });
    }
  }
  await db.attendanceRecord.createMany({ data: rows, skipDuplicates: true });
  console.info(
    `Demo ready: ${employees.length} fictional employees and ${rows.length} attendance fixtures.`,
  );
  console.info(
    "Demo accounts: hr@example.com, manager@example.com, employee@example.com, hr2@example.com",
  );
  console.info("Demo password: PeopleOpsDemo!2026 (local synthetic data only)");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
