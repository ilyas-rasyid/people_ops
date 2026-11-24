import { holidaySchema } from "../payload/settings.schema";
import type { Route } from "../../../commons/routing/router";

import { db } from "../../../database/client";
import { isoDate } from "../../../commons/dates";
import { parse, uuid } from "../../../commons/validation";

export const listHolidays: Route["handler"] = async () =>
  db.holiday.findMany({ orderBy: { date: "asc" } });

export const createHoliday: Route["handler"] = async (ctx) => {
  const data = parse(holidaySchema, ctx.body);
  return db.holiday.create({ data: { date: isoDate(data.date), name: data.name } });
};

export const updateHoliday: Route["handler"] = async (ctx) => {
  const data = parse(holidaySchema, ctx.body);
  return db.holiday.update({
    where: { id: parse(uuid, ctx.params.id) },
    data: {
      name: data.name,
      date: isoDate(data.date),
    },
  });
};

export const archiveHoliday: Route["handler"] = async (ctx) =>
  db.holiday.update({ where: { id: parse(uuid, ctx.params.id) }, data: { status: "ARCHIVED" } });
