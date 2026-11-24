import { z } from "zod";

export const credentials = z.strictObject({ email: z.email(), password: z.string().min(1) });

export const passwordChange = z.strictObject({
  currentPassword: z.string(),
  newPassword: z.string().min(12).max(128),
});
