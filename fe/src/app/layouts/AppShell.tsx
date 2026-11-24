import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UsersRound,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import type { Role } from "../../shared/types/domain";
import { initials } from "../../shared/lib/format";
import { Modal } from "../../shared/components/Modal";
import { PrimaryButton, SecondaryButton } from "../../shared/components/Controls";

type NavigationItem = { label: string; path: string; icon: LucideIcon; roles: Role[] };
const allRoles: Role[] = ["HR_ADMIN", "MANAGER", "EMPLOYEE"];
const navigation: { title: string; items: NavigationItem[] }[] = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Overview", path: "/app/dashboard", icon: LayoutDashboard, roles: allRoles },
      { label: "Employees", path: "/app/employees", icon: UsersRound, roles: ["HR_ADMIN"] },
      { label: "My Team", path: "/app/team", icon: UsersRound, roles: ["MANAGER"] },
      {
        label: "Approvals",
        path: "/app/approvals",
        icon: CalendarCheck2,
        roles: ["MANAGER", "HR_ADMIN"],
      },
    ],
  },
  {
    title: "PEOPLE OPERATIONS",
    items: [
      { label: "Attendance", path: "/app/attendance", icon: Clock3, roles: ["HR_ADMIN"] },
      { label: "My Attendance", path: "/app/me/attendance", icon: CalendarClock, roles: allRoles },
      { label: "My Leave", path: "/app/me/leave", icon: ClipboardList, roles: allRoles },
      {
        label: "Leave Requests",
        path: "/app/leave/requests",
        icon: FileClock,
        roles: ["HR_ADMIN"],
      },
      { label: "Team Attendance", path: "/app/team/attendance", icon: Clock3, roles: ["MANAGER"] },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      {
        label: "Departments",
        path: "/app/organization/departments",
        icon: Building2,
        roles: ["HR_ADMIN"],
      },
      {
        label: "Positions",
        path: "/app/organization/positions",
        icon: BarChart3,
        roles: ["HR_ADMIN"],
      },
      { label: "Audit Log", path: "/app/audit", icon: ShieldCheck, roles: ["HR_ADMIN"] },
      { label: "Settings", path: "/app/settings/company", icon: Settings2, roles: ["HR_ADMIN"] },
    ],
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  if (!user) return null;
  const links = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(user.role)),
    }))
    .filter((group) => group.items.length);
  const title =
    [...links.flatMap((group) => group.items)].find((item) => location.pathname === item.path)
      ?.label ?? "PeopleOps";
  return (
    <div className={`workspace ${collapsed ? "workspace-collapsed" : ""}`}>
      {mobileOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Link to="/app/dashboard" className="brand-link" onClick={() => setMobileOpen(false)}>
            <span className="brand-symbol">
              <UsersRound size={19} />
            </span>
            {!collapsed && (
              <span>
                peopleops<span className="brand-period">.</span>
              </span>
            )}
          </Link>
          <button
            className="mobile-close icon-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-avatar">N</span>
          {!collapsed && (
            <div>
              <strong>Northstar Studio</strong>
              <small>Company workspace</small>
            </div>
          )}
          {!collapsed && <ChevronDown size={15} className="workspace-chevron" />}
        </div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {links.map((group) => (
            <div className="nav-group" key={group.title}>
              {!collapsed && <p className="nav-heading">{group.title}</p>}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `nav-item ${isActive ? "nav-item-active" : ""}`}
                >
                  <item.icon size={18} strokeWidth={1.8} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link className="profile-link" to="/app/me/profile">
            <span className="avatar">{initials(user.fullName)}</span>
            {!collapsed && (
              <span className="profile-name">
                <strong>{user.fullName}</strong>
                <small>{user.role.replace("_", " ").toLowerCase()}</small>
              </span>
            )}
          </Link>
          <button
            className="sidebar-logout"
            onClick={() => setConfirmLogout(true)}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
        <button
          className="sidebar-collapse"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="topbar-section">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="environment-tag">● Live workspace</span>
            <Link
              to="/app/account/security"
              className="topbar-avatar"
              aria-label="Account settings"
            >
              {initials(user.fullName)}
            </Link>
          </div>
        </header>
        <main className="page-container">
          <Outlet />
        </main>
      </div>
      {confirmLogout && (
        <Modal
          title="Sign out of PeopleOps?"
          onClose={() => !loggingOut && setConfirmLogout(false)}
          footer={
            <>
              <SecondaryButton disabled={loggingOut} onClick={() => setConfirmLogout(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton
                disabled={loggingOut}
                onClick={async () => {
                  setLoggingOut(true);
                  try {
                    await logout();
                  } finally {
                    setLoggingOut(false);
                    setConfirmLogout(false);
                  }
                }}
              >
                {loggingOut ? "Signing out..." : "Sign out"}
              </PrimaryButton>
            </>
          }
        >
          <p>
            Are you sure you want to sign out of your account? Any unsaved changes in progress will
            be lost.
          </p>
        </Modal>
      )}
    </div>
  );
}
