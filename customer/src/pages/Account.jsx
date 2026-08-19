import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { user } = useAuth();

  return (
    <>
      <h1 className="page-title">Account</h1>
      <p className="page-subtitle">Your profile and portal access.</p>

      <div className="settings-grid">
        <section className="panel stack-panel">
          <div>
            <h2 className="section-title">Profile information</h2>
            <p className="section-subtitle">This is the account used for ticket updates and OTP login.</p>
          </div>
          <div className="settings-list">
            <div><span>Name</span><strong>{user?.name || "-"}</strong></div>
            <div><span>Email</span><strong>{user?.email || "-"}</strong></div>
            <div><span>Role</span><strong>{user?.role || "-"}</strong></div>
            <div><span>Status</span><strong>Active</strong></div>
          </div>
        </section>

        <section className="panel stack-panel">
          <div>
            <h2 className="section-title">Ticket workflow</h2>
            <p className="section-subtitle">Raise tickets, follow assignment, and reply from My Tickets.</p>
          </div>
          <div className="settings-list">
            <div><span>Login security</span><strong>Email OTP</strong></div>
            <div><span>Ticket visibility</span><strong>Only your tickets</strong></div>
            <div><span>Comments</span><strong>Shared with support team</strong></div>
          </div>
        </section>
      </div>
    </>
  );
}
