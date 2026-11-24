import { scheduleSchema } from "../payload/settings.schema";
import type { Route } from "../../../commons/routing/router";

import { db } from "../../../database/client";
import { company, isoDate } from "../../../commons/dates";
import { parse } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor } from "../../../commons/routing/router";

export const listWorkSchedules: Route["handler"] = async () =>
  db.workSchedule.findMany({ orderBy: { effectiveFrom: "desc" } });

export const createWorkSchedule: Route["handler"] = async (ctx) => {
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
};
