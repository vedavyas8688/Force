import { useAuth } from "../context/AuthContext";

export default function Account() {
  const { user } = useAuth();
  return (
    <>
      <h1 className="page-title">Account</h1>
      <p className="page-subtitle">Your profile details.</p>
      <div className="panel" style={{ maxWidth: 480 }}>
        <div className="field"><label>Name</label><input value={user?.name || ""} disabled /></div>
        <div className="field"><label>Email</label><input value={user?.email || ""} disabled /></div>
        <div className="field"><label>Role</label><input value={user?.role || ""} disabled /></div>
      </div>
    </>
  );
}
