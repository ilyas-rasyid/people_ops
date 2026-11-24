import { route } from "../../../commons/routing/router";
import {
  getCompanySettings,
  updateCompanySettings,
  getLeavePolicy,
  updateLeavePolicy,
} from "../service/company-settings.service";
import { listWorkSchedules, createWorkSchedule } from "../service/work-schedule.service";
import { listHolidays, createHoliday, updateHoliday, archiveHoliday } from "../service/holiday.service";

export const settingsRoutes = [
  route(
    "GET",
    "/api/v1/settings/company",
    "HR",
    getCompanySettings,
  ),
  route(
    "PATCH",
    "/api/v1/settings/company",
    "HR",
    updateCompanySettings,
  ),
  route(
    "GET",
    "/api/v1/settings/leave-policy",
    "HR",
    getLeavePolicy,
  ),
  route(
    "PATCH",
    "/api/v1/settings/leave-policy",
    "HR",
    updateLeavePolicy,
  ),
  route(
    "GET",
    "/api/v1/settings/work-schedules",
    "HR",
    listWorkSchedules,
  ),
  route(
    "POST",
    "/api/v1/settings/work-schedules",
    "HR",
    createWorkSchedule,
    true,
  ),
  route(
    "GET",
    "/api/v1/settings/holidays",
    "HR",
    listHolidays,
  ),
  route(
    "POST",
    "/api/v1/settings/holidays",
    "HR",
    createHoliday,
    true,
  ),
  route(
    "PATCH",
    "/api/v1/settings/holidays/:id",
    "HR",
    updateHoliday,
  ),
  route(
    "POST",
    "/api/v1/settings/holidays/:id/archive",
    "HR",
    archiveHoliday,
  )
];
