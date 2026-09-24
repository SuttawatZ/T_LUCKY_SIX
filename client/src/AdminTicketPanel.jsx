import { useEffect, useState } from "react";
import { Pencil, PlusCircle, Trash2, X } from "lucide-react";
import { lotteryApi } from "./lotteryApi";
import { userApi } from "./userApi";

const emptyForm = { drawId: "", number: "", series: "", setCode: "", price: "80" };

export default function AdminTicketPanel() {
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [draws, setDraws] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingTicketId, setEditingTicketId] = useState(null);

  useEffect(() => {
    const handleAuthChanged = (event) => setAdmin(event.detail?.role === "admin");
    window.addEventListener("lucky-six-auth-changed", handleAuthChanged);
    if (localStorage.getItem("lucky-six-token")) {
      userApi.me().then(({ user }) => setAdmin(user.role === "admin")).catch(() => null);
    }
    return () => window.removeEventListener("lucky-six-auth-changed", handleAuthChanged);
  }, []);

  const loadTickets = async () => {
    try {
      const { tickets: list } = await lotteryApi.adminTickets();
      setTickets(Array.isArray(list) ? list : []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const show = async () => {
    setOpen(true);
    setMessage("");
    try {
      const data = await lotteryApi.draws();
      const active = data.filter((draw) => ["open", "upcoming"].includes(draw.status));
      setDraws(active);
      setForm((current) => ({ ...emptyForm, drawId: active[0]?._id || current.drawId || "", price: current.price || "80" }));
      await loadTickets();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const resetForm = () => {
    setEditingTicketId(null);
    setForm((current) => ({ ...emptyForm, drawId: draws[0]?._id || current.drawId || "", price: "80" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        drawId: form.drawId,
        number: String(form.number).replace(/\D/g, ""),
        series: form.series || "",
        setCode: form.setCode || "",
        price: Number(form.price),
      };

      if (!payload.drawId) throw new Error("กรุณาเลือกงวดสลาก");
      if (!/^\d{6}$/.test(payload.number)) throw new Error("เลขสลากต้องเป็นเลข 6 หลัก");
      if (!Number.isFinite(payload.price) || payload.price < 80) throw new Error("ราคาสลากต้องไม่น้อยกว่า 80 บาท");

      if (editingTicketId) {
        const { ticket: updated } = await lotteryApi.updateTicket(editingTicketId, payload);
        setTickets((all) => all.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)));
        setMessage("แก้ไขสลากเรียบร้อยแล้ว");
      } else {
        await lotteryApi.createTicket(payload);
        setMessage("เพิ่มสลากเรียบร้อยแล้ว");
      }

      resetForm();
      const { tickets: list } = await lotteryApi.adminTickets();
      setTickets(Array.isArray(list) ? list : []);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const startEditTicket = (ticket) => {
    setEditingTicketId(ticket._id);
    setForm({
      drawId: ticket.drawId?._id || ticket.drawId || "",
      number: String(ticket.number || ""),
      series: ticket.series || "",
      setCode: ticket.setCode || "",
      price: String(ticket.price || 80),
    });
    setMessage("");
  };

  const deleteTicket = async (ticketId) => {
    if (!window.confirm("ลบสลากใบนี้ใช่หรือไม่")) return;
    try {
      await lotteryApi.deleteTicket(ticketId);
      setTickets((all) => all.filter((item) => item._id !== ticketId));
      if (editingTicketId === ticketId) resetForm();
      setMessage("ลบสลากเรียบร้อยแล้ว");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!admin) return null;

  const input = (key, label, props = {}) => (
    <label className="block text-sm font-medium">
      {label}
      <input
        value={form[key]}
        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-amber-300"
        {...props}
      />
    </label>
  );

  return (
    <>
      <button onClick={show} className="fixed bottom-5 left-36 z-30 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-bold text-white shadow-lg">
        <PlusCircle size={17} />เพิ่มสลาก
      </button>

      {open && (
        <>
          <button type="button" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/45" aria-label="ปิด" />
          <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="max-h-[90vh] overflow-y-auto p-6">
              <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-slate-100 p-2">
                <X size={17} />
              </button>

              <p className="text-xs font-bold tracking-wider text-amber-700">ADMIN</p>
              <h2 className="mt-1 text-2xl font-bold">{editingTicketId ? "แก้ไขสลาก" : "เพิ่มสลากกินแบ่ง"}</h2>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium">
                  งวดสลาก
                  <select
                    required
                    value={form.drawId}
                    onChange={(event) => setForm({ ...form, drawId: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {draws.length ? (
                      draws.map((draw) => (
                        <option key={draw._id} value={draw._id}>
                          {draw.label}
                        </option>
                      ))
                    ) : (
                      <option value="">ไม่พบงวดที่เปิดขาย</option>
                    )}
                  </select>
                </label>

                {input("number", "เลขสลาก 6 หลัก", {
                  required: true,
                  inputMode: "numeric",
                  pattern: "[0-9]{6}",
                  maxLength: 6,
                  placeholder: "123456",
                })}

                {input("series", "ชุด / ซีรีส์", { placeholder: "เช่น ชุด 01" })}
                {input("setCode", "รหัสชุด", { placeholder: "ไม่บังคับ" })}

                <label className="block text-sm font-medium md:col-span-2">
                  ราคา (บาท)
                  <input
                    required
                    type="number"
                    min="80"
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <div className="md:col-span-2 flex items-center justify-between gap-3">
                  {editingTicketId && (
                    <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600">
                      ยกเลิกแก้ไข
                    </button>
                  )}
                  <button type="submit" disabled={!draws.length} className="ml-auto rounded-lg bg-ink px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
                    {editingTicketId ? "บันทึกการแก้ไข" : "บันทึกสลาก"}
                  </button>
                </div>
              </form>
            </div>

            {message && (
              <p className={`mt-4 text-sm ${message.includes("เรียบร้อย") ? "text-emerald-700" : "text-red-600"}`}>
                {message}
              </p>
            )}

            <div className="mt-6 overflow-x-auto">
              <h3 className="mb-3 text-lg font-bold">รายการสลากที่มีอยู่ในระบบ</h3>
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b text-slate-500">
                  <tr>
                    <th className="pb-3">เลขสลาก</th>
                    <th className="pb-3">งวด</th>
                    <th className="pb-3">ชุด</th>
                    <th className="pb-3">ราคา</th>
                    <th className="pb-3">สถานะ</th>
                    <th className="pb-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length ? (
                    tickets.map((ticket) => (
                      <tr key={ticket._id} className="border-b align-middle">
                        <td className="py-3 font-bold tracking-[0.2em]">{ticket.number}</td>
                        <td>{ticket.drawId?.label || "—"}</td>
                        <td>{ticket.series || ticket.setCode || "—"}</td>
                        <td>{Number(ticket.price || 0).toLocaleString()} บาท</td>
                        <td>{ticket.status || "available"}</td>
                        <td className="py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => startEditTicket(ticket)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
                            >
                              <Pencil size={14} />แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteTicket(ticket._id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                            >
                              <Trash2 size={14} />ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-500">
                        ยังไม่มีสลากในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

