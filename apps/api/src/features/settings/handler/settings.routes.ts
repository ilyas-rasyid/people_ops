import { z } from "zod";
import { db } from "../../../database/client";
import { company, isoDate } from "../../../commons/dates";
import { parse, dateOnly, reason, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor, route } from "../../../commons/routing/router";

const companySchema = z.strictObject({ name: z.string().min(2).max(120) });
const policySchema = z.strictObject({ defaultAnnualDays: z.number().int().min(0).max(365) });
const scheduleSchema = z.strictObject({
  effectiveFrom: dateOnly,
  workingDays: z.string().regex(/^[1-7](,[1-7])*$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  graceMinutes: z.number().int().min(0).max(180),
});
const holidaySchema = z.strictObject({ date: dateOnly, name: z.string().min(2).max(120) });

export const settingsRoutes = [
  route("GET", "/api/v1/settings/company", "HR", company),
  route("PATCH", "/api/v1/settings/company", "HR", async (ctx) => {
    const data = parse(companySchema, ctx.body);
    return db.$transaction(async (tx) => {
      const settings = await tx.companySettings.findFirstOrThrow();
      const result = await tx.companySettings.update({
        where: { id: settings.id },
        data: { name: data.name, version: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor(ctx).userId,
          eventType: "COMPANY_UPDATED",
          resource: "CompanySettings",
          resourceId: settings.id,
          requestId: ctx.requestId,
        },
      });
      return result;
    });
  }),
  route("GET", "/api/v1/settings/leave-policy", "HR", company),
  route("PATCH", "/api/v1/settings/leave-policy", "HR", async (ctx) => {
    const data = parse(policySchema, ctx.body);
    const settings = await company();
    return db.$transaction(async (tx) => {
      const result = await tx.companySettings.update({
        where: { id: settings.id },
        data: { defaultAnnualDays: data.defaultAnnualDays, version: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor(ctx).userId,
          eventType: "LEAVE_POLICY_UPDATED",
          resource: "CompanySettings",
          resourceId: settings.id,
          requestId: ctx.requestId,
        },
      });
      return result;
    });
  }),
  route("GET", "/api/v1/settings/work-schedules", "HR", async () =>
    db.workSchedule.findMany({ orderBy: { effectiveFrom: "desc" } }),
  ),
  route(
    "POST",
    "/api/v1/settings/work-schedules",
    "HR",
    async (ctx) => {
      const data = parse(scheduleSchema, ctx.body);
      invariant(
        data.startTime < data.endTime,
        422,
        "INVALID_SCHEDULE",
        "End time must follow start time.",
      );
      const settings = await company();
      const latest = await db.workSchedule.findFirst({ orderBy: { effectiveFrom: "desc" } });
      invariant(
        !latest || data.effectiveFrom > latest.effectiveFrom.toISOString().slice(0, 10),
        409,
        "SCHEDULE_CONFLICT",
        "New schedule must begin after the existing schedule.",
      );
      return db.$transaction(async (tx) => {
        if (latest)
          await tx.workSchedule.update({
            where: { id: latest.id },
            data: {
              effectiveUntil: new Date(isoDate(data.effectiveFrom).getTime() - 86400_000),
            },
          });
        const result = await tx.workSchedule.create({
          data: {
            ...data,
            effectiveFrom: isoDate(data.effectiveFrom),
            timezone: settings.timezone,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: actor(ctx).userId,
            eventType: "SCHEDULE_CREATED",
            resource: "WorkSchedule",
            resourceId: result.id,
            requestId: ctx.requestId,
          },
        });
        return result;
      });
    },
    true,
  ),
  route("GET", "/api/v1/settings/holidays", "HR", async () =>
    db.holiday.findMany({ orderBy: { date: "asc" } }),
  ),
  route(
    "POST",
    "/api/v1/settings/holidays",
    "HR",
    async (ctx) => {
      const data = parse(holidaySchema, ctx.body);
      return db.holiday.create({ data: { date: isoDate(data.date), name: data.name } });
    },
    true,
  ),
  route("PATCH", "/api/v1/settings/holidays/:id", "HR", async (ctx) => {
    const data = parse(holidaySchema, ctx.body);
    return db.holiday.update({
      where: { id: parse(uuid, ctx.params.id) },
      data: {
        name: data.name,
        date: isoDate(data.date),
      },
    });
  }),
  route("POST", "/api/v1/settings/holidays/:id/archive", "HR", async (ctx) =>
    db.holiday.update({ where: { id: parse(uuid, ctx.params.id) }, data: { status: "ARCHIVED" } }),
  ),
];
