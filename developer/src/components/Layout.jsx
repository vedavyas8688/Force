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
            <strong>Developer Workspace</strong>
            <span>Assigned tickets, AI analysis, and delivery updates</span>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
            <div className="topbar-user">
              <span>{user?.name?.[0]?.toUpperCase() || "D"}</span>
              <div>
                <strong>{user?.name || "Developer"}</strong>
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
