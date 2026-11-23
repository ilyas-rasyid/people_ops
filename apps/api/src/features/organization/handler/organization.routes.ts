import { z } from "zod";
import { db } from "../../../database/client";
import { parse, uuid } from "../../../commons/validation";
import { invariant } from "../../../commons/errors/app-error";
import { actor, route } from "../../../commons/routing/router";

const departmentSchema = z.strictObject({ name: z.string().trim().min(2).max(100) });
const positionSchema = z.strictObject({ title: z.string().trim().min(2).max(100) });

function entityRoutes(entity: "department" | "position") {
  const isDept = entity === "department";
  const segment = isDept ? "departments" : "positions";
  const field = isDept ? "name" : "title";
  // Prisma generated delegate unions are narrowed by explicit model branches.
  return [
    route("GET", `/api/v1/${segment}`, "HR", async () =>
      isDept
        ? db.department.findMany({ orderBy: { name: "asc" } })
        : db.position.findMany({ orderBy: { title: "asc" } }),
    ),
    route(
      "POST",
      `/api/v1/${segment}`,
      "HR",
      async (ctx) => {
        const values = parse(isDept ? departmentSchema : positionSchema, ctx.body);
        const name = (values as { name?: string; title?: string })[field as "name" | "title"]!;
        const normalized = name.toLowerCase();
        const existing = isDept
          ? await db.department.findFirst({
              where: { normalizedName: normalized, status: "ACTIVE" },
            })
          : await db.position.findFirst({
              where: { normalizedTitle: normalized, status: "ACTIVE" },
            });
        invariant(
          !existing,
          409,
          "DUPLICATE_ACTIVE_NAME",
          "A matching active item already exists.",
        );
        return db.$transaction(async (tx) => {
          const result = isDept
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
      },
      true,
    ),
    route("PATCH", `/api/v1/${segment}/:id`, "HR", async (ctx) => {
      const id = parse(uuid, ctx.params.id);
      const values = parse(isDept ? departmentSchema : positionSchema, ctx.body);
      const name = (values as { name?: string; title?: string })[field as "name" | "title"]!;
      return db.$transaction(async (tx) => {
        const result = isDept
          ? await tx.department.update({
              where: { id },
              data: {
                name,
                normalizedName: name.toLowerCase(),
              },
            })
          : await tx.position.update({
              where: { id },
              data: {
                title: name,
                normalizedTitle: name.toLowerCase(),
              },
            });
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
    }),
    route("POST", `/api/v1/${segment}/:id/:action`, "HR", async (ctx) => {
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
            ...(isDept ? { departmentId: id } : { positionId: id }),
            status: "ACTIVE",
          },
        });
        invariant(!inUse, 409, "RESOURCE_IN_USE", "Reassign active employees before archiving.");
      }
      return db.$transaction(async (tx) => {
        const result = isDept
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
    }),
  ];
}

export const organizationRoutes = [...entityRoutes("department"), ...entityRoutes("position")];
