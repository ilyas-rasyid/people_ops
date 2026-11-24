import { z } from "zod";

export const departmentSchema = z.strictObject({ name: z.string().trim().min(2).max(100) });

export const positionSchema = z.strictObject({ title: z.string().trim().min(2).max(100) });
