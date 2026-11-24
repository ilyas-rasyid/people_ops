import { db } from "../../../database/client";
import { employeeInclude } from "../service/employee.service";

export const employeeProjection = {
  ...employeeInclude,
  user: {
    select: { id: true, role: true, status: true, mustChangePassword: true },
  },
} as const;

export const teamProjection = {
  id: true,
  employeeCode: true,
  fullName: true,
  workEmail: true,
  departmentId: true,
  positionId: true,
  managerId: true,
  joinDate: true,
  status: true,
  version: true,
  department: { select: { id: true, name: true, status: true } },
  position: { select: { id: true, title: true, status: true } },
} as const;

type ListFilters = {
  page: number;
  pageSize: number;
  search?: string | undefined;
  departmentId?: string | undefined;
  status?: string | undefined;
};

export async function listEmployeesRepository({
  page,
  pageSize,
  search,
  departmentId,
  status,
}: ListFilters) {
  const where = {
    ...(search
      ? {
        OR: [
          { fullName: { contains: search, mode: "insensitive" as const } },
          { employeeCode: { contains: search, mode: "insensitive" as const } },
          { workEmail: { contains: search, mode: "insensitive" as const } },
        ],
      }
      : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(status ? { status } : {}),
  };
  const [items, total] = await Promise.all([
    db.employee.findMany({
      where,
      include: employeeProjection,
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.employee.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export function getEmployeeRepository(id: string) {
  return db.employee.findUniqueOrThrow({ where: { id }, include: employeeProjection });
}

export function getEmploymentHistoryRepository(employeeId: string) {
  return db.employmentRecord.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export function listDirectReportsRepository(managerId: string) {
  return db.employee.findMany({
    where: { managerId },
    select: teamProjection,
    orderBy: { fullName: "asc" },
  });
}

export function getDirectReportRepository(id: string, managerId: string) {
  return db.employee.findFirst({
    where: { id, managerId },
    select: teamProjection,
  });
}
