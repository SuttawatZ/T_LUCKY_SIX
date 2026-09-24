const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("lucky-six-token");
  const response = await fetch(`${API_URL}/users${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
  return data;
}

export const userApi = {
  register: (body) => request("/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/me"),
  update: (body) => request("/me", { method: "PATCH", body: JSON.stringify(body) }),
  users: (query = "") => request(`/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`),
  updateUser: (id, body) => request(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};
