import { useEffect, useState } from "react";
import { Shield, X } from "lucide-react";
import { userApi } from "./userApi";
import { lotteryApi } from "./lotteryApi";

export default function AdminPanel() {
  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthChanged = (event) => setMe(event.detail || null);
    window.addEventListener("lucky-six-auth-changed", handleAuthChanged);
    if (localStorage.getItem("lucky-six-token")) {
      userApi.me().then(({ user }) => setMe(user)).catch(() => null);
    }
    return () => window.removeEventListener("lucky-six-auth-changed", handleAuthChanged);
  }, []);

  const load = async () => {
    try {
      const data = await userApi.users();
      setUsers(data.users || []);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  };

  const save = async (user) => {
    try {
      const { user: updated } = await userApi.updateUser(user.id, { role: user.role, kycStatus: user.kycStatus });
      setUsers((all) => all.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  };

  if (me?.role !== "admin") return null;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          load();
        }}
        className="fixed bottom-5 left-5 z-30 flex items-center gap-2 rounded-full bg-amber-400 px-4 py-3 text-sm font-bold text-ink shadow-lg"
      >
        <Shield size={17} />ผู้ดูแล
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 bg-slate-950/45" onClick={() => setOpen(false)} aria-label="ปิด" />
          <section className="fixed inset-4 z-50 mx-auto max-w-5xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold tracking-wider text-amber-700">ADMINISTRATION</p>
                <h2 className="text-2xl font-bold">จัดการผู้ใช้งาน</h2>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full bg-slate-100 p-2">
                <X size={18} />
              </button>
            </div>

            {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b text-slate-500">
                  <tr>
                    <th className="pb-3">ชื่อ / เบอร์โทร</th>
                    <th className="pb-3">อีเมล</th>
                    <th className="pb-3">บทบาท</th>
                    <th className="pb-3">ยืนยันตัวตน</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-3">
                        <b>{user.name}</b>
                        <span className="block text-slate-500">{user.phone}</span>
                      </td>
                      <td>{user.email || "—"}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => setUsers((all) => all.map((item) => (item.id === user.id ? { ...item, role: e.target.value } : item)))}
                          className="rounded border p-2"
                        >
                          <option value="customer">customer</option>
                          <option value="staff">staff</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={user.kycStatus}
                          onChange={(e) => setUsers((all) => all.map((item) => (item.id === user.id ? { ...item, kycStatus: e.target.value } : item)))}
                          className="rounded border p-2"
                        >
                          <option value="unverified">unverified</option>
                          <option value="pending">pending</option>
                          <option value="verified">verified</option>
                          <option value="rejected">rejected</option>
                        </select>
                      </td>
                      <td>
                        <button onClick={() => save(user)} className="rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white">
                          บันทึก
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
