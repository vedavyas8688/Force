import { Bell, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  function submitSearch(event) {
    event.preventDefault();
    const search = query.trim();
    navigate(search ? `/tickets?search=${encodeURIComponent(search)}` : "/tickets");
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <form className="topbar-search" onSubmit={submitSearch}>
            <Search size={16} />
            <input
              placeholder="Search tickets, organizations, customers..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>
          <div className="topbar-actions">
            <button className="notification-button" type="button" onClick={() => setAlertsOpen((value) => !value)}>
              <Bell size={18} />
              <span>5</span>
            </button>
            {alertsOpen && (
              <div className="topbar-menu alert-menu">
                <strong>Notifications</strong>
                <p>Review reopen requests and SLA alerts from the Tickets page.</p>
                <button type="button" onClick={() => navigate("/tickets")}>Open tickets</button>
              </div>
            )}
            <button className="topbar-user" type="button" onClick={() => setUserOpen((value) => !value)}>
              <span>{user?.name?.[0]?.toUpperCase() || "A"}</span>
              <div>
                <strong>{user?.name || "Admin User"}</strong>
                <small>Super Admin</small>
              </div>
              <ChevronDown size={15} />
            </button>
            {userOpen && (
              <div className="topbar-menu user-menu">
                <button type="button" onClick={() => navigate("/settings")}>Settings</button>
                <button type="button" onClick={logout}>Log out</button>
              </div>
            )}
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
