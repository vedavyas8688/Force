import { BarChart3, Building2, LayoutDashboard, LogOut, ShieldCheck, TicketCheck, UserPlus } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const navItems = [
  { to: "/", label: "Platform", icon: LayoutDashboard },
  { to: "/organizations", label: "Organizations", icon: Building2 },
  { to: "/admins", label: "Admins", icon: UserPlus },
  { to: "/usage", label: "Usage & Compliance", icon: BarChart3 },
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
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
