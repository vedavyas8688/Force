import { createContext, useContext, useEffect, useState } from "react";
import { authApi, getTokens, setTokens, clearTokens } from "../api/client";

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
      .then(({ user }) => setUser(user))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { res, data } = await authApi.login({ email, password });
    if (!res.ok) throw new Error(data?.error || "Login failed");
    if (data.user?.role === "super_admin") {
      throw new Error("Use the Super Admin portal for this account");
    }
    setTokens(data);
    setUser(data.user);
    return data.user;
  }

  async function signup(payload) {
    const { res, data } = await authApi.signup(payload);
    if (!res.ok) throw new Error(data?.error || "Signup failed");
    return data;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // token may already be invalid; clear locally regardless
    }
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
