import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import AiAnalysis from "./pages/AiAnalysis";
import Assignments from "./pages/Assignments";
import Projects from "./pages/Projects";
import Repositories from "./pages/Repositories";
import Users from "./pages/Users";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/ai-analysis" element={<AiAnalysis />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/repositories" element={<Repositories />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

