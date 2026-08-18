import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="topbar-crumb">
            <b>Developer Portal</b> / org:{" "}
            {user?.organizationId ? String(user.organizationId).slice(-8) : "—"}
          </div>
          <div className="topbar-crumb">{user?.email}</div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
