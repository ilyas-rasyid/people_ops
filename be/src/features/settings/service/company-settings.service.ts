import { policySchema, companySchema } from "../payload/settings.schema";
import type { Route } from "../../../commons/routing/router";

import { db } from "../../../database/client";
import { company } from "../../../commons/dates";
import { parse } from "../../../commons/validation";
import { actor } from "../../../commons/routing/router";

export const getCompanySettings: Route["handler"] = company;

export const updateCompanySettings: Route["handler"] = async (ctx) => {
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
};

export const getLeavePolicy: Route["handler"] = company;

export const updateLeavePolicy: Route["handler"] = async (ctx) => {
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
};
