import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, getTokens, notificationsApi } from "../api/client";

export default function NotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const { accessToken } = getTokens();
    if (!accessToken) return undefined;

    const source = new EventSource(`${API_BASE}/notifications/stream?token=${encodeURIComponent(accessToken)}`);
    source.addEventListener("notification", () => {
      setUnreadCount((current) => current + 1);
    });

    return () => source.close();
  }, []);

  async function loadNotifications() {
    try {
      const data = await notificationsApi.list();
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setUnreadCount(0);
    }
  }

  return (
    <div className="notification-shell">
      <button className="notification-button" type="button" onClick={() => navigate("/notifications")}>
        <Bell size={18} />
        {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
    </div>
  );
}
