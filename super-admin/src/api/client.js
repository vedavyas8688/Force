const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export function getTokens() {
  return {
    accessToken: localStorage.getItem("superAccessToken"),
    refreshToken: localStorage.getItem("superRefreshToken"),
  };
}

export function setTokens({ accessToken, refreshToken }) {
  localStorage.setItem("superAccessToken", accessToken);
  localStorage.setItem("superRefreshToken", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("superAccessToken");
  localStorage.removeItem("superRefreshToken");
}

async function rawRequest(path, options = {}) {
  const { accessToken } = getTokens();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty response
  }

  return { res, data };
}

export async function apiRequest(path, options = {}) {
  let { res, data } = await rawRequest(path, options);

  if (res.status === 401) {
    const { refreshToken } = getTokens();
    if (!refreshToken) {
      clearTokens();
      throw new Error("Not authenticated");
    }

    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      clearTokens();
      throw new Error("Session expired");
    }

    const refreshed = await refreshRes.json();
    setTokens(refreshed);
    ({ res, data } = await rawRequest(path, options));
  }

  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export const authApi = {
  login: (payload) =>
    rawRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => apiRequest("/auth/me"),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
};

export const platformApi = {
  overview: () => apiRequest("/platform/overview"),
};

export const globalTicketsApi = {
  overview: () => apiRequest("/admin/tickets/overview"),
};
