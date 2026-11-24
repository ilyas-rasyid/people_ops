import { route } from "../../../commons/routing/router";
import {
  login,
  getCurrentUser,
  getCsrfToken,
  logout,
  getSecuritySummary,
} from "../service/authentication.service";
import { changePassword, completeFirstPasswordChange } from "../service/password.service";

export const authRoutes = [
  route(
    "POST",
    "/api/v1/auth/login",
    "PUBLIC",
    login,
  ),
  route(
    "GET",
    "/api/v1/auth/me",
    "AUTH",
    getCurrentUser,
  ),
  route(
    "GET",
    "/api/v1/auth/csrf",
    "AUTH",
    getCsrfToken,
  ),
  route(
    "POST",
    "/api/v1/auth/logout",
    "AUTH",
    logout,
  ),
  route(
    "POST",
    "/api/v1/auth/change-password",
    "AUTH",
    changePassword,
  ),
  route(
    "POST",
    "/api/v1/auth/first-password-change",
    "AUTH",
    completeFirstPasswordChange,
  ),
  route(
    "GET",
    "/api/v1/account/security",
    "AUTH",
    getSecuritySummary,
  )
];
