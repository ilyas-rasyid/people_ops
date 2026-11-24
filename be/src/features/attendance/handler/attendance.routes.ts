import { route } from "../../../commons/routing/router";
import {
  getTodayAttendance,
  getMyAttendance,
  listAttendance,
  listTeamAttendance,
  getAttendanceDetail,
  listAttendanceAdjustments,
} from "../service/attendance-read.service";
import { clockIn, clockOut } from "../service/attendance-clock.service";
import { correctAttendance } from "../service/attendance-correction.service";

export const attendanceRoutes = [
  route(
    "GET",
    "/api/v1/me/attendance/today",
    "AUTH",
    getTodayAttendance,
  ),
  route(
    "GET",
    "/api/v1/me/attendance",
    "AUTH",
    getMyAttendance,
  ),
  route(
    "POST",
    "/api/v1/me/attendance/clock-in",
    "AUTH",
    clockIn,
    true,
  ),
  route(
    "POST",
    "/api/v1/me/attendance/clock-out",
    "AUTH",
    clockOut,
    true,
  ),
  route(
    "GET",
    "/api/v1/attendance",
    "HR",
    listAttendance,
  ),
  route(
    "GET",
    "/api/v1/team/attendance",
    "MANAGER",
    listTeamAttendance,
  ),
  route(
    "GET",
    "/api/v1/attendance/:id",
    "HR",
    getAttendanceDetail,
  ),
  route(
    "GET",
    "/api/v1/attendance/:id/adjustments",
    "HR",
    listAttendanceAdjustments,
  ),
  route(
    "POST",
    "/api/v1/attendance/corrections",
    "HR",
    correctAttendance,
    true,
  )
];
