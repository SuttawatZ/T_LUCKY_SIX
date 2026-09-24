const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("lucky-six-token");
  const response = await fetch(`${API_URL}/lottery${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });

  if (response.status === 204) return null;

  const raw = await response.text();
  if (!raw) return null;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error("ไม่สามารถอ่านผลลัพธ์จากเซิร์ฟเวอร์ได้");
  }

  if (!response.ok) throw new Error(data.message || "ไม่สามารถเชื่อมต่อข้อมูลสลากได้");
  return data;
}

export const lotteryApi = {
  dashboard: () => request("/dashboard"),
  results: () => request("/results"),
  tickets: () => request("/tickets?limit=100"),
  draws: () => request("/draws"),
  createTicket: (body) => request("/admin/tickets", { method: "POST", body: JSON.stringify(body) }),
  adminTickets: () => request("/admin/tickets"),
  updateTicket: (id, body) => request(`/admin/tickets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTicket: (id) => request(`/admin/tickets/${id}`, { method: "DELETE" }),
  orders: () => request("/admin/orders"),
  approvePayment: (id) => request(`/admin/orders/${id}/approve-payment`, { method: "PATCH" }),
  publishResults: (id, body) => request(`/admin/draws/${id}/results`, { method: "PATCH", body: JSON.stringify(body) }),
  cart: (ownerKey) => request(`/carts/${ownerKey}`),
  addToCart: (ownerKey, ticketId) => request("/carts/items", { method: "POST", body: JSON.stringify({ ownerKey, ticketId }) }),
  removeFromCart: (ownerKey, ticketId) => request("/carts/items", { method: "DELETE", body: JSON.stringify({ ownerKey, ticketId }) }),
};
