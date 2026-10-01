import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import { lotteryApi } from "./lotteryApi";
import { userApi } from "./userApi";

const methods = [
  ["promptpay", "PromptPay QR"],
  ["bank_transfer", "โอนผ่านธนาคาร"],
  ["credit_card", "บัตรเครดิต"],
  ["truemoney", "TrueMoney Wallet"],
];
const baht = (value) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);

export default function CheckoutPanel({ cart, total, ownerKey, onClose, onSuccess }) {
  const [user, setUser] = useState(null); const [authRequired, setAuthRequired] = useState(false); const [paymentMethod, setPaymentMethod] = useState("promptpay"); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { userApi.me().then(({ user: current }) => setUser(current)).catch(() => setAuthRequired(true)); }, []);
  const submit = async () => {
    setError(""); setLoading(true);
    try { const order = await lotteryApi.createOrder({ ownerKey, paymentMethod }); onSuccess(order); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return <><button aria-label="ปิดหน้า Checkout" onClick={onClose} className="fixed inset-0 z-[60] bg-slate-950/55" /><section className="fixed inset-4 z-[70] mx-auto max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:inset-y-8 sm:p-8">
    <div className="flex items-start justify-between"><div><button onClick={onClose} className="mb-3 text-sm text-amber-700"><ArrowLeft size={15} className="mr-1 inline" />กลับไปตะกร้า</button><h2 className="text-2xl font-bold text-ink">สรุปและชำระเงิน</h2></div><button onClick={onClose} aria-label="ปิด" className="rounded-full bg-slate-100 p-2"><X size={17} /></button></div>
    <div className="mt-5 divide-y rounded-xl border border-slate-200 px-4">{cart.map((ticket) => <div key={ticket.id} className="flex justify-between gap-3 py-3 text-sm"><span><b className="font-mono tracking-widest">{ticket.number}</b><span className="ml-2 text-slate-500">{ticket.set}</span></span><b>{baht(ticket.price)}</b></div>)}</div>
    <div className="mt-4 flex justify-between rounded-xl bg-slate-50 p-4"><span>ยอดรวม</span><b className="text-xl">{baht(total)}</b></div>
    <h3 className="mt-6 font-bold">เลือกช่องทางชำระเงิน</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{methods.map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${paymentMethod === value ? "border-amber-500 bg-amber-50" : "border-slate-200"}`}><input type="radio" name="payment" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />{label}</label>)}</div>
    {paymentMethod === "promptpay" && <div className="mt-4 flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><div className="grid h-20 w-20 place-items-center bg-white text-center text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">QR<br />DEMO</div><p className="text-sm text-slate-600">QR จำลองสำหรับสาธิตเท่านั้น ไม่มีการเรียกเก็บเงินจริง</p></div>}
    {authRequired ? <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm"><p>กรุณาเข้าสู่ระบบและยืนยันอายุ 20 ปีขึ้นไปก่อนสั่งซื้อ</p><button onClick={() => { onClose(); window.dispatchEvent(new Event("lucky-six-open-auth")); }} className="mt-3 rounded-lg bg-ink px-4 py-2 font-bold text-white">เข้าสู่ระบบ</button></div> : user && !user.ageVerified ? <p className="mt-4 text-sm text-red-600">บัญชีนี้ยังยืนยันอายุ 20 ปีขึ้นไปไม่ได้ จึงสั่งซื้อไม่ได้</p> : null}
    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">ระบบชำระเงินนี้เป็นแบบจำลองเพื่อการสาธิต ไม่ส่งข้อมูลบัตรหรือรับเงินจริง</p>
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={!user || !user.ageVerified || authRequired || !cart.length || loading} onClick={submit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-3.5 font-bold text-white disabled:opacity-40"><CheckCircle2 size={18} />{loading ? "กำลังยืนยันคำสั่งซื้อ…" : "ยืนยันคำสั่งซื้อ (สาธิต)"}</button>
  </section></>;
}
