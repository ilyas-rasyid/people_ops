import { z } from "zod";
import { dateOnly, reason, uuid } from "../../../commons/validation";

export const correctionSchema = z.strictObject({
  employeeId: uuid,
  workDate: dateOnly,
  clockInAt: z.iso.datetime({ offset: true }).nullable(),
  clockOutAt: z.iso.datetime({ offset: true }).nullable(),
  reason,
  expectedVersion: z.number().int().nonnegative().optional(),
});
