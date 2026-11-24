import { db } from "../../../database/client";

export const requestInclude = {
  leaveType: true,
  employee: {
    select: { id: true, fullName: true, employeeCode: true, departmentId: true },
  },
  approver: { select: { id: true, employee: { select: { fullName: true } } } },
  reservation: true,
} as const;

type LeaveFilters = {
  employeeId?: string;
  approverId?: string;
  status?: string;
};

export async function listLeaveRequestsRepository(
  where: LeaveFilters,
  page: number,
  pageSize: number,
) {
  const [items, total] = await Promise.all([
    db.leaveRequest.findMany({
      where,
      include: requestInclude,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.leaveRequest.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export function getOwnLeaveRequestRepository(id: string, employeeId: string) {
  return db.leaveRequest.findFirst({
    where: { id, employeeId },
    include: requestInclude,
  });
}

export function getLeaveRequestRepository(id: string) {
  return db.leaveRequest.findUniqueOrThrow({
    where: { id },
    include: requestInclude,
  });
}
