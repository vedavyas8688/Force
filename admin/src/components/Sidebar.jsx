import {
  BriefcaseBusiness,
  FolderKanban,
  Activity,
  Plug,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TicketCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, scope: "all" },
  { to: "/tickets", label: "Tickets", icon: TicketCheck, scope: "all" },
  { to: "/users", label: "Users", icon: Users, scope: "organization" },
  { to: "/assignments", label: "Assignments", icon: BriefcaseBusiness, scope: "organization" },
  { to: "/projects", label: "Projects", icon: FolderKanban, scope: "organization" },
  { to: "/integrations", label: "Integrations", icon: Plug, scope: "organization" },
  { to: "/activity-logs", label: "Activity Logs", icon: Activity, scope: "organization" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
      <div className="sidebar-brand">
        <span className="brand-glyph"><LifeBuoy size={20} /></span>
        <span className="sidebar-brand-name">Admin Portal</span>
        <button
          className="sidebar-collapse-icon"
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.filter((item) => item.scope === "all" || user?.role !== "super_admin").map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  "sidebar-link" + (isActive ? " active" : "")
                }
              >
                <Icon size={17} />
                <span className="sidebar-label">{item.label}</span>
              </NavLink>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            "sidebar-link sidebar-footer-link" + (isActive ? " active" : "")
          }
        >
          <Settings size={17} />
          <span className="sidebar-label">Settings</span>
        </NavLink>
        <div className="sidebar-user-card">
          <span className="avatar-chip">{user?.name?.[0]?.toUpperCase() || "A"}</span>
          <div className="sidebar-user-meta">
            <strong>{user?.name || "Admin User"}</strong>
            <span>{user?.role === "super_admin" ? "Super Admin" : "Organization Admin"}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={logout}>
          <LogOut size={16} />
          <span className="sidebar-label">Log out</span>
        </button>
      </div>
    </aside>
  );
}
