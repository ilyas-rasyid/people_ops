import { positionSchema, departmentSchema } from "../payload/organization.schema";

import { db } from "../../../database/client";
import { parse, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor } from "../../../commons/routing/router";
import type { Context } from "../../../commons/routing/router";

type OrganizationEntity = "department" | "position";

function parseName(entity: OrganizationEntity, body: unknown) {
  if (entity === "department") return parse(departmentSchema, body).name;
  return parse(positionSchema, body).title;
}

export function listOrganization(entity: OrganizationEntity) {
  return entity === "department"
    ? db.department.findMany({ orderBy: { name: "asc" } })
    : db.position.findMany({ orderBy: { title: "asc" } });
}

export async function createOrganization(entity: OrganizationEntity, ctx: Context) {
  const name = parseName(entity, ctx.body);
  const normalized = name.toLowerCase();
  const existing =
    entity === "department"
      ? await db.department.findFirst({ where: { normalizedName: normalized, status: "ACTIVE" } })
      : await db.position.findFirst({ where: { normalizedTitle: normalized, status: "ACTIVE" } });

  invariant(!existing, 409, "DUPLICATE_ACTIVE_NAME", "A matching active item already exists.");
  return db.$transaction(async (tx) => {
    const result =
      entity === "department"
        ? await tx.department.create({ data: { name, normalizedName: normalized } })
        : await tx.position.create({ data: { title: name, normalizedTitle: normalized } });
    await tx.auditLog.create({
      data: {
        actorId: actor(ctx).userId,
        eventType: `${entity.toUpperCase()}_CREATED`,
        resource: entity,
        resourceId: result.id,
        requestId: ctx.requestId,
      },
    });
    return result;
  });
}

export async function updateOrganization(entity: OrganizationEntity, ctx: Context) {
  const id = parse(uuid, ctx.params.id);
  const name = parseName(entity, ctx.body);
  return db.$transaction(async (tx) => {
    const result =
      entity === "department"
        ? await tx.department.update({ where: { id }, data: { name, normalizedName: name.toLowerCase() } })
        : await tx.position.update({ where: { id }, data: { title: name, normalizedTitle: name.toLowerCase() } });
    await tx.auditLog.create({
      data: {
        actorId: actor(ctx).userId,
        eventType: `${entity.toUpperCase()}_UPDATED`,
        resource: entity,
        resourceId: id,
        requestId: ctx.requestId,
      },
    });
    return result;
  });
}

export async function changeOrganizationStatus(entity: OrganizationEntity, ctx: Context) {
  const id = parse(uuid, ctx.params.id);
  invariant(
    ["archive", "reactivate"].includes(ctx.params.action!),
    404,
    "RESOURCE_NOT_FOUND",
    "Action not found.",
  );
  const status = ctx.params.action === "archive" ? "ARCHIVED" : "ACTIVE";
  if (status === "ARCHIVED") {
    const inUse = await db.employee.count({
      where: {
        ...(entity === "department" ? { departmentId: id } : { positionId: id }),
        status: "ACTIVE",
      },
    });
    invariant(!inUse, 409, "RESOURCE_IN_USE", "Reassign active employees before archiving.");
  }

  return db.$transaction(async (tx) => {
    const result =
      entity === "department"
        ? await tx.department.update({ where: { id }, data: { status } })
        : await tx.position.update({ where: { id }, data: { status } });
    await tx.auditLog.create({
      data: {
        actorId: actor(ctx).userId,
        eventType: `${entity.toUpperCase()}_${status}`,
        resource: entity,
        resourceId: id,
        requestId: ctx.requestId,
      },
    });
    return result;
  });
}
