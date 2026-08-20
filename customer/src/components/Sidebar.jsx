import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/tickets", label: "My Tickets", icon: "ticket" },
  { to: "/tickets/new", label: "New Ticket", icon: "plus" },
  { to: "/account", label: "Account", icon: "account" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark"><SidebarIcon name="shield" /></span>
        <div>
          <span className="sidebar-brand-name">FORCE</span>
          <small>Customer Portal</small>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
          >
            <span className="sidebar-link-icon"><SidebarIcon name={item.icon} /></span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-org">
          <span className="sidebar-avatar">{user?.name?.[0]?.toUpperCase() || "C"}</span>
          <div>
            <strong>{user?.name || "Customer"}</strong>
            <span className="sidebar-role-chip">{user?.role || "customer"}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}

function SidebarIcon({ name }) {
  const icons = {
    shield: <path d="M12 3l7 3v5c0 4.4-2.8 7.6-7 10-4.2-2.4-7-5.6-7-10V6l7-3z M9.5 12l1.8 1.8L15.5 9.5" />,
    dashboard: <path d="M4 5h6v6H4V5z M14 5h6v6h-6V5z M4 15h6v4H4v-4z M14 15h6v4h-6v-4z" />,
    ticket: <path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V4H4v4z M8 8h8" />,
    plus: <path d="M12 5v14M5 12h14" />,
    account: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c1.5-4 14.5-4 16 0" />,
  };

  return (
    <svg className="sidebar-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}
