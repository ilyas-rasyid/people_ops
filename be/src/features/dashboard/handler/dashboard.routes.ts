import { route } from "../../../commons/routing/router";
import { getDashboard } from "../service/dashboard.service";

export const dashboardRoutes = [
  route("GET", "/api/v1/dashboard", "AUTH", getDashboard),
];
