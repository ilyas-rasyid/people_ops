import { z } from "zod";
import { reason } from "../../../commons/validation";

export const roleSchema = z.strictObject({ role: z.enum(["HR_ADMIN", "MANAGER", "EMPLOYEE"]) });

export const actionReason = z.strictObject({ reason });

export const selfContact = z.strictObject({ phoneNumber: z.string().max(30).nullable() });
