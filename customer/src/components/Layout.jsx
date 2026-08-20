import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <strong>Customer Workspace</strong>
            <span>Tickets, updates, and account activity</span>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
            <div className="topbar-user">
              <span>{user?.name?.[0]?.toUpperCase() || "C"}</span>
              <div>
                <strong>{user?.name || "Customer"}</strong>
                <small>{user?.email}</small>
              </div>
            </div>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
