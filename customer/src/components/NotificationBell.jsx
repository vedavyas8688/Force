import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, getTokens, notificationsApi } from "../api/client";

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const { accessToken } = getTokens();
    if (!accessToken) return undefined;

    const source = new EventSource(`${API_BASE}/notifications/stream?token=${encodeURIComponent(accessToken)}`);
    source.addEventListener("notification", (event) => {
      const notification = JSON.parse(event.data);
      setNotifications((current) => [notification, ...current].slice(0, 30));
      setUnreadCount((current) => current + 1);
    });

    return () => source.close();
  }, []);

  const topNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  async function loadNotifications() {
    try {
      const data = await notificationsApi.list();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }

  async function openNotification(notification) {
    if (!notification.readAt) {
      setUnreadCount((current) => Math.max(current - 1, 0));
      setNotifications((current) =>
        current.map((item) =>
          item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
      notificationsApi.markRead(notification._id).catch(() => {});
    }

    setOpen(false);
    navigate("/tickets");
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, readAt: notification.readAt || new Date().toISOString() }))
    );
  }

  return (
    <div className="notification-shell">
      <button className="notification-button" type="button" onClick={() => setOpen((value) => !value)}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
          <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16l-2-2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && <strong>{unreadCount > 9 ? "9+" : unreadCount}</strong>}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            <button type="button" disabled={unreadCount === 0} onClick={markAllRead}>Mark all read</button>
          </div>
          {topNotifications.length === 0 ? (
            <p>No notifications yet.</p>
          ) : (
            <div className="notification-list">
              {topNotifications.map((notification) => (
                <button
                  type="button"
                  className={notification.readAt ? "notification-item" : "notification-item unread"}
                  key={notification._id}
                  onClick={() => openNotification(notification)}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.body}</span>
                  <small>{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : ""}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
