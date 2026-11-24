import { z } from "zod";
import { dateOnly, note, reason, uuid } from "../../../commons/validation";

export const adjustmentSchema = z.strictObject({
  deltaDays: z
    .number()
    .int()
    .refine((value) => value !== 0),
  reason,
});

export const decisionSchema = z.strictObject({
  reason: z.string().max(1000).optional(),
  expectedVersion: z.number().int().positive().optional(),
});

export const requestSchema = z.strictObject({
  leaveTypeId: uuid,
  startDate: dateOnly,
  endDate: dateOnly,
  note,
});

export const cancelSchema = z.strictObject({ reason: z.string().max(1000).optional() });
