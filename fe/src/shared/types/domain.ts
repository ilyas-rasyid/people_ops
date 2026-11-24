export type Role = "HR_ADMIN" | "MANAGER" | "EMPLOYEE";
export type SessionUser = {
  id: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  role: Role;
  mustChangePassword: boolean;
};
export type Department = { id: string; name: string; status: string; };
export type Position = { id: string; title: string; status: string; };
export type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  phoneNumber: string | null;
  joinDate: string;
  departmentId: string;
  positionId: string;
  managerId: string | null;
  status: string;
  version: number;
  department?: Department;
  position?: Position;
  manager?: { id: string; fullName: string; } | null;
  user?: { id: string; role: Role; status: string; } | null;
};
export type LeaveType = { id: string; code: string; name: string; deductsBalance: boolean; };
export type LeaveRequest = {
  id: string;
  employeeId: string;
  status: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  note?: string;
  submittedAt: string;
  version: number;
  approverId: string;
  employee?: { id: string; fullName: string; employeeCode: string; };
  leaveType?: LeaveType;
  approver?: { id: string; employee: { fullName: string; }; };
};
export type AttendanceRow = {
  date: string;
  status: string;
  employee: { id: string; fullName: string; employeeCode: string; };
  record?: {
    id: string;
    clockInAt: string | null;
    clockOutAt: string | null;
    version: number;
  } | null;
};
export type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number; };
export type LeaveBalance = {
  allocated: number;
  netUsed: number;
  officialRemaining: number;
  reserved: number;
  available: number;
};
