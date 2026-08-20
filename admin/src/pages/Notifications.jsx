import {
  BellRing,
  CheckCircle2,
  LockKeyhole,
  RefreshCcw,
  RotateCcw,
  Search,
  Ticket,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, getTokens, notificationsApi } from "../api/client";

const tabs = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "tickets", label: "Tickets" },
  { key: "system", label: "System" },
];

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadNotifications();
    const { accessToken } = getTokens();
    if (!accessToken) return undefined;

    const source = new EventSource(`${API_BASE}/notifications/stream?token=${encodeURIComponent(accessToken)}`);
    source.addEventListener("notification", (event) => {
      const notification = JSON.parse(event.data);
      setNotifications((current) => [notification, ...current]);
    });

    return () => source.close();
  }, []);

  async function loadNotifications() {
    setError("");
    try {
      const data = await notificationsApi.list();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openNotification(notification) {
    if (!notification.readAt) {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => (item._id === notification._id ? { ...item, readAt } : item))
      );
      notificationsApi.markRead(notification._id).catch(() => {});
    }

    if (notification.link) navigate(notification.link);
  }

  async function markAllRead() {
    await notificationsApi.markAllRead();
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt || readAt })));
  }

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return notifications.filter((notification) => {
      const type = notification.type || "";
      const isTicket = type.startsWith("ticket_");
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "unread" && !notification.readAt) ||
        (activeTab === "tickets" && isTicket) ||
        (activeTab === "system" && !isTicket);

      if (!matchesTab) return false;
      if (!term) return true;

      return [notification.title, notification.body, notification.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [activeTab, notifications, search]);

  const grouped = useMemo(() => groupNotifications(filteredNotifications), [filteredNotifications]);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <section className="notifications-page">
      <div className="page-heading-row notifications-heading">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Ticket and system updates for your workspace.</p>
        </div>
        <button className="ghost-button" type="button" disabled={unreadCount === 0} onClick={markAllRead}>
          Mark all read
        </button>
      </div>

      {error && <div className="form-error table-notice">{error}</div>}

      <div className="notifications-card">
        <div className="notifications-card-header">
          <strong>Notifications</strong>
          <div className="notifications-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notifications..." />
          </div>
        </div>

        <div className="notifications-tabs">
          {tabs.map((tab) => (
            <button
              type="button"
              className={activeTab === tab.key ? "notifications-tab active" : "notifications-tab"}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {grouped.length === 0 ? (
          <div className="notifications-empty">
            <div className="id-tag">NO-NOTIFICATIONS</div>
            <p>No notifications found.</p>
          </div>
        ) : (
          <div className="notification-page-list">
            {grouped.map((group) => (
              <div className="notification-day-group" key={group.label}>
                <div className="notification-day-title">
                  <span>{group.label}</span>
                  <i />
                </div>
                {group.items.map((notification) => {
                  const config = notificationConfig(notification.type);
                  const Icon = config.icon;

                  return (
                    <button
                      type="button"
                      className={notification.readAt ? "notification-page-item" : "notification-page-item unread"}
                      key={notification._id}
                      onClick={() => openNotification(notification)}
                    >
                      <span className={`notification-icon-dot ${config.tone}`}>
                        <Icon size={16} />
                      </span>
                      <span className="notification-page-copy">
                        <strong>{notification.title}</strong>
                        <span>{notification.body}</span>
                        <small>{relativeTime(notification.createdAt)}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function notificationConfig(type = "") {
  const config = {
    ticket_created: { icon: Ticket, tone: "blue" },
    ticket_assigned: { icon: UserRoundCheck, tone: "amber" },
    ticket_status_changed: { icon: RefreshCcw, tone: "purple" },
    ticket_completed: { icon: CheckCircle2, tone: "green" },
    ticket_closed: { icon: LockKeyhole, tone: "slate" },
    ticket_reopen_requested: { icon: BellRing, tone: "red" },
    ticket_reopened: { icon: RotateCcw, tone: "purple" },
    ticket_reopen_rejected: { icon: XCircle, tone: "red" },
  };

  return config[type] || { icon: BellRing, tone: "blue" };
}

function groupNotifications(items) {
  const groups = new Map();

  for (const item of items) {
    const label = dayLabel(item.createdAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }

  return Array.from(groups, ([label, groupItems]) => ({ label, items: groupItems }));
}

function dayLabel(value) {
  if (!value) return "Earlier";

  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString();
}

function relativeTime(value) {
  if (!value) return "";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  return new Date(value).toLocaleString();
}
