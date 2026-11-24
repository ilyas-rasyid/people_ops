import { z } from "zod";
import { dateOnly } from "../../../commons/validation";

export const companySchema = z.strictObject({ name: z.string().min(2).max(120) });

export const policySchema = z.strictObject({ defaultAnnualDays: z.number().int().min(0).max(365) });

export const holidaySchema = z.strictObject({ date: dateOnly, name: z.string().min(2).max(120) });

export const scheduleSchema = z.strictObject({
  effectiveFrom: dateOnly,
  workingDays: z.string().regex(/^[1-7](,[1-7])*$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  graceMinutes: z.number().int().min(0).max(180),
});
