import { Building2, LayoutDashboard, LogOut, ShieldCheck, TicketCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const navItems = [
  { to: "/", label: "Platform", icon: LayoutDashboard },
  { to: "/tickets", label: "Global Tickets", icon: TicketCheck },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span><ShieldCheck size={21} /></span>
          <div>
            <strong>FORCE</strong>
            <small>Super Admin</small>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <span>{user?.name?.[0]?.toUpperCase() || "S"}</span>
            <div>
              <strong>{user?.name || "Super Admin"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button className="logout-button" type="button" onClick={logout}>
            <LogOut size={17} />
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <strong>Platform Control Center</strong>
            <small>No organization-level Git access here</small>
          </div>
          <div className="topbar-pill">
            <Building2 size={16} />
            Multi-tenant platform
          </div>
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
