import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "#" },
  { to: "/tickets", label: "Tickets", icon: "T" },
  { to: "/ai-analysis", label: "AI Analysis", icon: "A" },
  { to: "/assignments", label: "Assignments", icon: "→" },
  { to: "/projects", label: "Projects", icon: "P" },
  { to: "/repositories", label: "Git Settings", icon: "G" },
  { to: "/users", label: "Users", icon: "U" },
  { to: "/settings", label: "Settings", icon: "S" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">:3002</span>
        <span className="sidebar-brand-name">Admin Portal</span>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " active" : "")
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-org">
          <strong>{user?.name || "—"}</strong>
          <span className="sidebar-role-chip">{user?.role || "admin"}</span>
        </div>
        <button className="sidebar-logout" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}

