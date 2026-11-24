import { z } from "zod";
import { uuid, dateOnly } from "../../../commons/validation";

export const employeeFields = z.strictObject({
  fullName: z.string().trim().min(2).max(120),
  workEmail: z.email(),
  phoneNumber: z.string().max(30).nullable().optional(),
  departmentId: uuid,
  positionId: uuid,
  managerId: uuid.nullable().optional(),
});
export const employeeCreate = employeeFields.extend({
  employeeCode: z.string().trim().min(3).max(30),
  joinDate: dateOnly,
  createAccount: z.boolean().optional(),
  accountRole: z.enum(["HR_ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
});
export const employeeUpdate = employeeFields
  .partial()
  .extend({ expectedVersion: z.number().int().positive() });
