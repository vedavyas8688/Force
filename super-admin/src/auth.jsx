import { createContext, useContext, useEffect, useState } from "react";
import { authApi, clearTokens, getTokens, setTokens } from "./api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then(({ user: nextUser }) => setUser(nextUser))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { res, data } = await authApi.login({ email, password });
    if (!res.ok) throw new Error(data?.error || "Login failed");
    if (data.user?.role !== "super_admin") {
      throw new Error("Use a Super Admin account for this portal");
    }
    setTokens(data);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // clear locally regardless
    }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
