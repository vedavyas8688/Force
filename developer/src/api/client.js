const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function getTokens() {
  return {
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
  };
}

function setTokens({ accessToken, refreshToken }) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
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
    // no body
  }

  return { res, data };
}

/**
 * Wraps rawRequest with a single automatic refresh-and-retry on 401,
 * so every screen just calls apiRequest() without touching tokens itself.
 */
export async function apiRequest(path, options = {}) {
  let { res, data } = await rawRequest(path, options);

  if (res.status === 401) {
    const { refreshToken } = getTokens();
    if (!refreshToken) {
      clearTokens();
      throw new ApiError("Not authenticated", 401);
    }

    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      clearTokens();
      throw new ApiError("Session expired", 401);
    }

    const refreshed = await refreshRes.json();
    setTokens(refreshed);

    // retry the original request once with the new access token
    ({ res, data } = await rawRequest(path, options));
  }

  if (!res.ok) {
    throw new ApiError(data?.error || "Request failed", res.status);
  }

  return data;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const authApi = {
  signup: (payload) =>
    rawRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    rawRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyOtp: (payload) =>
    rawRequest("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  acceptInvite: (payload) =>
    rawRequest("/users/accept-invite", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  me: () => apiRequest("/auth/me"),
};

export const projectsApi = {
  list: () => apiRequest("/projects"),
  create: (payload) =>
    apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const ticketsApi = {
  list: () => apiRequest("/tickets"),
  get: (id) => apiRequest(`/tickets/${id}`),
  create: (payload) =>
    apiRequest("/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  assign: (id, developerId) =>
    apiRequest(`/tickets/${id}/assign`, {
      method: "PATCH",
      body: JSON.stringify({ developerId }),
    }),
  updateStatus: (id, status) =>
    apiRequest(`/tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  addComment: (id, body) =>
    apiRequest(`/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
};
export const dashboardApi = {
  summary: () => apiRequest("/dashboard/summary"),
};
export { getTokens, setTokens, clearTokens };




