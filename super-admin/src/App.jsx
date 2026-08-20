import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Tickets from "./pages/Tickets.jsx";
import Organizations from "./pages/Organizations.jsx";
import Admins from "./pages/Admins.jsx";
import Usage from "./pages/Usage.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="auth-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "super_admin") return <Navigate to="/login?error=super-admin-only" replace />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/organizations" element={<Organizations />} />
            <Route path="/admins" element={<Admins />} />
            <Route path="/usage" element={<Usage />} />
            <Route path="/tickets" element={<Tickets />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
