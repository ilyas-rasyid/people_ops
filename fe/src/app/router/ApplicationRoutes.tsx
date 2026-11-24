import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../layouts/AppShell";
import { LoginPage } from "../../features/auth/pages/LoginPage";
import { PasswordChangePage } from "../../features/auth/pages/PasswordChangePage";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { EmployeeDirectoryPage } from "../../features/employees/pages/EmployeeDirectoryPage";
import { EmployeeFormPage } from "../../features/employees/pages/EmployeeFormPage";
import { EmployeeDetailPage } from "../../features/employees/pages/EmployeeDetailPage";
import { MyAttendancePage } from "../../features/attendance/pages/MyAttendancePage";
import { AttendanceManagementPage } from "../../features/attendance/pages/AttendanceManagementPage";
import { MyLeavePage } from "../../features/leave/pages/MyLeavePage";
import { RequestLeavePage } from "../../features/leave/pages/RequestLeavePage";
import { LeaveDetailPage } from "../../features/leave/pages/LeaveDetailPage";
import { ApprovalQueuePage } from "../../features/approvals/pages/ApprovalQueuePage";
import { OrganizationPage } from "../../features/organization/pages/OrganizationPage";
import { AuditLogPage } from "../../features/audit/pages/AuditLogPage";
import { SettingsPage } from "../../features/settings/pages/SettingsPage";
import { ProfilePage } from "../../features/profile/pages/ProfilePage";

import { RequireSession, FirstLoginGate } from "./SessionGuards";

export function ApplicationRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/first-login/change-password" element={<FirstLoginGate />} />
      <Route
        path="/app"
        element={
          <RequireSession>
            <AppShell />
          </RequireSession>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="me/profile" element={<ProfilePage />} />
        <Route path="me/attendance" element={<MyAttendancePage />} />
        <Route path="me/leave" element={<MyLeavePage />} />
        <Route path="me/leave/new" element={<RequestLeavePage />} />
        <Route path="me/leave/:requestId" element={<LeaveDetailPage />} />
        <Route path="account/security" element={<PasswordChangePage />} />
        <Route
          path="employees"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <EmployeeDirectoryPage />
            </RequireSession>
          }
        />
        <Route
          path="employees/new"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <EmployeeFormPage />
            </RequireSession>
          }
        />
        <Route
          path="employees/:employeeId"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <EmployeeDetailPage />
            </RequireSession>
          }
        />
        <Route
          path="employees/:employeeId/edit"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <EmployeeFormPage />
            </RequireSession>
          }
        />
        <Route
          path="team"
          element={
            <RequireSession roles={["MANAGER"]}>
              <EmployeeDirectoryPage team />
            </RequireSession>
          }
        />
        <Route
          path="team/:employeeId"
          element={
            <RequireSession roles={["MANAGER"]}>
              <EmployeeDetailPage team />
            </RequireSession>
          }
        />
        <Route
          path="team/attendance"
          element={
            <RequireSession roles={["MANAGER"]}>
              <AttendanceManagementPage team />
            </RequireSession>
          }
        />
        <Route
          path="approvals"
          element={
            <RequireSession roles={["MANAGER", "HR_ADMIN"]}>
              <ApprovalQueuePage />
            </RequireSession>
          }
        />
        <Route
          path="approvals/:requestId"
          element={
            <RequireSession roles={["MANAGER", "HR_ADMIN"]}>
              <LeaveDetailPage approval />
            </RequireSession>
          }
        />
        <Route
          path="attendance"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <AttendanceManagementPage />
            </RequireSession>
          }
        />
        <Route
          path="leave/requests"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <ApprovalQueuePage all />
            </RequireSession>
          }
        />
        <Route
          path="organization/departments"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <OrganizationPage type="departments" />
            </RequireSession>
          }
        />
        <Route
          path="organization/positions"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <OrganizationPage type="positions" />
            </RequireSession>
          }
        />
        <Route
          path="audit"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <AuditLogPage />
            </RequireSession>
          }
        />
        <Route
          path="settings/company"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <SettingsPage />
            </RequireSession>
          }
        />
        <Route
          path="settings/work-calendar"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <SettingsPage />
            </RequireSession>
          }
        />
        <Route
          path="settings/leave-policy"
          element={
            <RequireSession roles={["HR_ADMIN"]}>
              <SettingsPage />
            </RequireSession>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
    </Routes>
  );
}
