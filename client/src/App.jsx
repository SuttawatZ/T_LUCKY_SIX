import { useEffect, useMemo, useRef, useState } from "react";
import UserPanel from "./UserPanel";
import CheckoutPanel from "./CheckoutPanel";
import AdminPanel from "./AdminPanel";
import AdminTicketPanel from "./AdminTicketPanel";
import PrizeChecker from "./PrizeChecker";
import { lotteryApi } from "./lotteryApi";
import { ArrowDown, ArrowRight, Check, Clock3, Dices, Menu, Minus, Moon, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Sun, Ticket, Trophy, X } from "lucide-react";

const numbers = ["019284","155090","228811","336729","403009","568956","709118","818284","927700","110011","290519","645192","081624","190745","224680","317459","420168","509327","630491","748205","871036","990261","012345","100001","123789","222908","316416","428997","517247","609112","734567","856140","945023","054321","162834","273945","384056","495167","506278","617389","728490","839501","940612","051723","163845","274956","385067","496178","507289","618390","729401","830512","941623","052734","164856","275967","386078","497189","508290","619401","720512","831623","942734","063845","174956","285067","396178","407289","518390","629401"];
const tickets = numbers.map((number, index) => ({ id: index + 1, number, price: [80, 90, 100, 120][index % 4], set: `ชุด ${String(index + 1).padStart(2, "0")}` }));
const baht = (value) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(value);
const nextDraw = (now = new Date()) => {
  const candidates = [1, 16].map((day) => new Date(now.getFullYear(), now.getMonth(), day, 15, 0, 0));
  const upcoming = candidates.find((date) => date > now) || new Date(now.getFullYear(), now.getMonth() + 1, 1, 15, 0, 0);
  return { date: upcoming, label: new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(upcoming) };
};
const timeUntil = (target, now = new Date()) => {
  const totalSeconds = Math.max(0, Math.floor((target - now) / 1000));
  return { days: Math.floor(totalSeconds / 86400), hours: Math.floor((totalSeconds % 86400) / 3600), minutes: Math.floor((totalSeconds % 3600) / 60), seconds: totalSeconds % 60 };
};

const informationPages = [
  {
    id: "about",
    title: "เกี่ยวกับเรา",
    intro: "LUCKY SIX เป็นเว็บไซต์ตัวอย่างสำหรับสาธิตหน้าร้านและการจัดการสลาก",
    sections: [
      ["สถานะของเว็บไซต์", "ชื่อบริษัท เลขใบอนุญาต สถิติ และช่องทางติดต่อในเว็บไซต์นี้เป็นข้อมูลจำลองทั้งหมด ไม่ใช่ข้อมูลของผู้ประกอบการจริง และไม่ใช่เว็บไซต์ของสำนักงานสลากกินแบ่งรัฐบาล"],
      ["การใช้งาน", "ระบบนี้จัดทำเพื่อสาธิตหน้าจอ การค้นหา การจอง และขั้นตอนชำระเงินจำลองเท่านั้น ไม่ได้ยืนยันการได้รับใบอนุญาตหรือสิทธิจำหน่ายสลากจริง"],
    ],
  },
  {
    id: "privacy",
    title: "นโยบายความเป็นส่วนตัว",
    intro: "เนื้อหานี้เป็นนโยบายตัวอย่างสำหรับระบบสาธิต และต้องปรับให้ตรงกับการดำเนินงานจริงก่อนเปิดให้บริการ",
    sections: [
      ["ข้อมูลในระบบสาธิต", "ระบบอาจใช้ข้อมูลบัญชีและรายการสั่งซื้อเพื่อแสดงการทำงานของหน้าจอ โดยข้อมูลอาจจัดเก็บในฐานข้อมูลหรืออุปกรณ์ที่ใช้ทดสอบตามการตั้งค่าของผู้ดูแล"],
      ["การใช้งานข้อมูล", "โปรดหลีกเลี่ยงการกรอกข้อมูลส่วนบุคคลหรือข้อมูลการชำระเงินจริงในระบบสาธิตนี้ เนื้อหานี้ไม่ได้เป็นคำรับรองการจัดเก็บ การรักษาความปลอดภัย หรือการใช้ข้อมูลของบริการจริง"],
      ["คำขอเกี่ยวกับข้อมูล", "ช่องทางติดต่อในหน้านี้เป็นข้อมูลสมมติ จึงไม่สามารถใช้ยื่นคำขอหรือรับเรื่องจริงได้"],
    ],
  },
  {
    id: "terms",
    title: "เงื่อนไขการใช้งาน",
    intro: "เว็บไซต์นี้จัดทำเพื่อสาธิตซอฟต์แวร์และข้อมูลตัวอย่างเท่านั้น",
    sections: [
      ["คำสั่งซื้อและการชำระเงิน", "คำสั่งซื้อ การจอง ใบเสร็จ และช่องทางชำระเงินในระบบเป็นข้อมูลจำลอง ไม่มีการรับเงินจริงหรือยืนยันสิทธิในสลากจริง"],
      ["อายุผู้ใช้", "หน้าสาธิตกำหนดให้ยืนยันอายุ 20 ปีขึ้นไปก่อนซื้อ โปรดเล่นอย่างมีสติ และห้ามจำหน่ายแก่ผู้มีอายุต่ำกว่า 20 ปี"],
      ["ข้อมูลประกอบ", "ตัวอย่างเลขสลาก ราคา งวด สถิติ และใบอนุญาตอาจไม่ใช่ข้อมูลปัจจุบันหรือข้อมูลจริง ห้ามใช้แทนการตรวจสอบกับหน่วยงานที่เกี่ยวข้อง"],
    ],
  },
  {
    id: "refund",
    title: "นโยบายคืนเงิน",
    intro: "นโยบายหน้านี้เป็นข้อมูลจำลองสำหรับการสาธิต",
    sections: [
      ["ไม่มีการรับชำระเงินจริง", "ระบบชำระเงินทั้งหมดเป็น mock payment จึงไม่มีการตัดเงินจริง คืนเงินจริง หรือออกหลักฐานการชำระเงินจริง"],
      ["กรณีพบปัญหา", "หากทดสอบแล้วพบรายการผิดพลาด ให้ถือเป็นข้อมูลทดสอบในระบบ และอย่านำใบเสร็จจำลองไปใช้เป็นหลักฐานทางการเงิน"],
      ["ก่อนเปิดบริการจริง", "ผู้ให้บริการจริงต้องกำหนดเงื่อนไขการยกเลิกและคืนเงินให้สอดคล้องกับกฎหมายและช่องทางชำระเงินที่ใช้งาน"],
    ],
  },
];

const demoContact = {
  company: "บริษัท ลัคกี้ ซิกซ์ เดโม จำกัด (ชื่อสมมติ)",
  license: "DEMO-LICENSE-0000 (เลขจำลอง ใช้ไม่ได้จริง)",
  phone: "02-000-0000 (เบอร์จำลอง ติดต่อจริงไม่ได้)",
  email: "demo@example.com (อีเมลตัวอย่าง ไม่ใช่ช่องทางบริการ)",
};

function TicketCard({ ticket, onAdd, onDetails, selectedIds, drawLabel }) {
  const available = ticket.copies.filter((copy) => !selectedIds.has(copy.id));
  const pair = available.length > 1 ? available.slice(0, 2) : [];
  return <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,.08)] transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-[0_14px_32px_rgba(220,38,38,.16)] sm:p-4">
    <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
      <span className="rounded-full bg-[#1e1e1e] px-2.5 py-1.5 text-white">งวด {ticket.drawLabel || drawLabel}</span>
      <span className="rounded-full bg-[#dc2626] px-2.5 py-1.5 text-white">{ticket.copies.length > 1 ? `เลขซ้ำ ${ticket.copies.length} ใบ` : ticket.set}</span>
    </div>
    <div className="ticket-cut ticket-number-panel mt-3 rounded-lg border border-dashed border-slate-300 bg-amber-50/70 px-2 py-4 text-center shadow-inner sm:py-5">
      <span className="text-[9px] font-bold uppercase tracking-[.18em] text-amber-700">LUCKY SIX • GOVERNMENT LOTTERY</span>
      <p className="ticket-number mt-3 font-['DM_Sans'] text-2xl font-bold tracking-[.2em] text-[#1e1e1e] sm:text-3xl">{ticket.number}</p>
      <span className="ticket-number-label mt-2 block text-[10px] text-slate-500">สลากกินแบ่งรัฐบาล</span>
    </div>
    <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
      <div className="mb-3 flex items-end justify-between gap-2"><span className="text-xs text-slate-500">ราคาเริ่มต้น / ใบ</span><b className="font-['DM_Sans'] text-xl font-bold text-amber-600">{baht(ticket.price)}</b></div>
      {available.length > 0 && <div className="grid grid-cols-2 gap-2"><button onClick={() => onAdd(available[0])} className="flex items-center justify-center gap-1 rounded-lg bg-[#dc2626] px-2 py-3 text-xs font-bold text-white hover:bg-[#b91c1c]"><ShoppingBag size={14} />ซื้อ 1 ใบ</button>{pair.length > 1 && <button onClick={() => onAdd(pair)} className="flex items-center justify-center gap-1 rounded-lg bg-ink px-2 py-3 text-xs font-bold text-white hover:bg-slate-700"><ShoppingBag size={14} />ซื้อเป็นคู่</button>}</div>}
      {available.length === 0 && <p className="rounded-lg bg-slate-100 py-3 text-center text-xs text-slate-500">อยู่ในตะกร้าแล้ว</p>}
      <button onClick={() => onDetails(ticket)} className="mt-2 w-full rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:border-amber-500 hover:text-amber-700">ดูรายละเอียดสลาก</button>
    </div>
  </article>;
}

const thaiDate = (value) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

function ResultsSection({ results }) {
  if (!results.length) return null;
  const [latest, ...previous] = results;
  return <section id="past-results" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-20">
    <div className="mb-7 flex items-end justify-between gap-4">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-amber-700">ตรวจผลรางวัล</p><h2 className="text-3xl font-bold">ผลรางวัลย้อนหลัง</h2></div>
      <Trophy className="hidden text-amber-500 sm:block" size={28} />
    </div>
    <article className="overflow-hidden rounded-2xl bg-[#242936] p-6 text-white shadow-[10px_10px_0_#7f1d1d] sm:p-8">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">งวดล่าสุด</p><h3 className="mt-2 text-2xl font-bold">{latest.label}</h3><p className="mt-1 text-sm text-blue-200">ประกาศผลเมื่อ {thaiDate(latest.drawDate)}</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-blue-100">รางวัลที่ 1</span></div>
      <div className="mt-7 rounded-xl bg-white/10 p-5"><p className="text-xs text-blue-200">เลขรางวัลที่ 1</p><p className="mt-2 font-['DM_Sans'] text-4xl font-bold tracking-[.18em] text-amber-300 sm:text-5xl">{latest.results?.firstPrize || "ยังไม่ประกาศ"}</p></div>
      {!!latest.results?.lastTwoDigits?.length && <div className="mt-5 flex flex-wrap items-center gap-3"><span className="text-sm text-blue-200">เลขท้าย 2 ตัว</span>{latest.results.lastTwoDigits.map((number) => <b key={number} className="rounded-lg bg-amber-300 px-4 py-2 font-['DM_Sans'] text-xl text-ink">{number}</b>)}</div>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-blue-200">เลขหน้า 3 ตัว</p><div className="mt-2 flex flex-wrap gap-2">{latest.results?.frontThreeDigits?.map((number) => <b key={number} className="rounded-lg bg-amber-300 px-3 py-2 font-['DM_Sans'] text-xl text-ink">{number}</b>)}</div></div><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-blue-200">เลขท้าย 3 ตัว</p><div className="mt-2 flex flex-wrap gap-2">{latest.results?.lastThreeDigits?.map((number) => <b key={number} className="rounded-lg bg-amber-300 px-3 py-2 font-['DM_Sans'] text-xl text-ink">{number}</b>)}</div></div></div>
    </article>
    {!!previous.length && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{previous.map((draw) => <article key={draw._id} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">{thaiDate(draw.drawDate)}</p><h3 className="mt-1 font-bold text-ink">{draw.label}</h3></div><Trophy className="shrink-0 text-amber-500" size={19} /></div><div className="mt-5 border-t border-dashed pt-4"><p className="text-xs text-slate-500">รางวัลที่ 1</p><p className="mt-1 font-['DM_Sans'] text-2xl font-bold tracking-[.16em] text-ink">{draw.results?.firstPrize || "-"}</p><div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>เลขท้าย 2 ตัว</span>{draw.results?.lastTwoDigits?.map((number) => <b key={number} className="rounded bg-amber-100 px-2 py-1 font-['DM_Sans'] text-sm text-amber-800">{number}</b>)}<span className="ml-1">หน้า 3 ตัว</span>{draw.results?.frontThreeDigits?.map((number) => <b key={number} className="rounded bg-slate-100 px-2 py-1 font-['DM_Sans'] text-sm text-slate-700">{number}</b>)}<span className="ml-1">ท้าย 3 ตัว</span>{draw.results?.lastThreeDigits?.map((number) => <b key={number} className="rounded bg-slate-100 px-2 py-1 font-['DM_Sans'] text-sm text-slate-700">{number}</b>)}</div></div></article>)}</div>}
  </section>;
}

function Wheel({ onSearch, tickets: availableTickets }) {
  const [value, setValue] = useState("— — — — — —");
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const result = "";
  const spin = () => {
    if (!availableTickets.length) return;
    const next = availableTickets[Math.floor(Math.random() * availableTickets.length)].number;
    setSpinning(true);
    setValue("กำลังสุ่ม...");
    setAngle((old) => old + 1800 + Math.floor(Math.random() * 1440));
    setTimeout(() => { setValue(next.split("").join(" ")); setSpinning(false); }, 2700);
  };
    return <section className="mx-auto max-w-6xl px-5 pb-6"><div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink to-[#242936] px-7 py-9 text-white sm:px-12"><div className="flex flex-col items-center justify-between gap-8 md:flex-row"><div className="max-w-lg"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-amber-300">Lucky draw</p><h2 className="text-3xl font-bold">วงล้อสุ่มเลขนำโชค</h2><p className="mt-3 text-sm leading-7 text-blue-100">หมุนวงล้อเพื่อรับเลข 6 หลัก แล้วค้นหาสลากที่ตรงกับเลขนั้นได้ทันที</p><p className="my-5 font-['DM_Sans'] text-3xl font-bold tracking-[.2em] text-amber-300">{value}</p><div className="flex flex-wrap gap-3"><button onClick={spin} disabled={spinning} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-bold text-ink transition hover:bg-amber-300 disabled:opacity-70"><Dices size={17} />{spinning ? "กำลังหมุน..." : "หมุนวงล้อ"}</button><button onClick={() => value[0] !== "—" && onSearch(value.replaceAll(" ", ""))} disabled={value[0] === "—" || spinning} className="rounded-lg px-3 text-sm text-white disabled:opacity-40">ค้นหาเลขนี้ <ArrowRight size={15} className="inline" /></button></div></div><div className="relative h-52 w-52 shrink-0"><span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 text-xl text-amber-300">◆</span><div style={{ transform: `rotate(${angle}deg)` }} className="relative grid h-52 w-52 place-items-center rounded-full border-8 border-amber-300 bg-[conic-gradient(#e5a52e_0deg_36deg,#f9da8c_36deg_72deg,#e5a52e_72deg_108deg,#f9da8c_108deg_144deg,#e5a52e_144deg_180deg,#f9da8c_180deg_216deg,#e5a52e_216deg_252deg,#f9da8c_252deg_288deg,#e5a52e_288deg_324deg,#f9da8c_324deg)] transition-transform duration-[2700ms] [transition-timing-function:cubic-bezier(.12,.75,.15,1)]"><div className={`grid h-28 w-28 place-items-center rounded-full border-4 border-amber-100 bg-[#153f70] text-center font-['DM_Sans'] text-sm font-bold ${result ? "tracking-[.12em] text-amber-300" : "tracking-widest text-white"}`}>{result || <>LUCKY<br />SIX</>}</div></div></div></div></div></section>;
}

export default function App() {
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState(""); const [cart, setCart] = useState([]); const [inventory, setInventory] = useState(tickets); const [results, setResults] = useState([]); const [drawer, setDrawer] = useState(false); const [notice, setNotice] = useState(""); const [darkMode, setDarkMode] = useState(() => localStorage.getItem("lucky-six-theme") === "dark");
  const [priceMin, setPriceMin] = useState(""); const [priceMax, setPriceMax] = useState(""); const [filterBySet, setFilterBySet] = useState(""); const [suffix, setSuffix] = useState(""); const [birthday, setBirthday] = useState(""); const [sortBy, setSortBy] = useState("number_asc"); const [page, setPage] = useState(1); const [detail, setDetail] = useState(null);
  const [now, setNow] = useState(() => new Date()); const [reservationExpiresAt, setReservationExpiresAt] = useState(null); const [checkoutOpen, setCheckoutOpen] = useState(false); const [receipt, setReceipt] = useState(null);
  const ownerKey = useMemo(() => { const saved = localStorage.getItem("lucky-six-cart-key"); if (saved) return saved; const next = crypto.randomUUID(); localStorage.setItem("lucky-six-cart-key", next); return next; }, []);
  const previousCartIds = useRef([]);
  useEffect(() => { document.documentElement.classList.toggle("dark", darkMode); localStorage.setItem("lucky-six-theme", darkMode ? "dark" : "light"); }, [darkMode]);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    Promise.all([lotteryApi.tickets(), lotteryApi.cart(ownerKey)]).then(([data, savedCart]) => {
      const loaded = data.map((ticket) => ({ id: ticket._id, drawId: String(ticket.drawId?._id || ticket.drawId || ""), drawLabel: ticket.drawId?.label || "", number: ticket.number, price: ticket.price, set: ticket.setCode || ticket.series || "\u0e0a\u0e38\u0e14\u0e2a\u0e25\u0e32\u0e01" }));
      if (loaded.length) setInventory(loaded);
      const source = loaded.length ? loaded : tickets;
      setCart((savedCart.items || []).map((item) => source.find((ticket) => ticket.id === item.ticketId) || ({ id: item.ticketId, number: item.number, price: item.priceSnapshot, set: "\u0e0a\u0e38\u0e14\u0e2a\u0e25\u0e32\u0e01" })));
      setReservationExpiresAt(savedCart.expiresAt ? new Date(savedCart.expiresAt) : null);
    }).catch(() => setNotice("API \u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d"));
  }, [ownerKey]);
  useEffect(() => { lotteryApi.results().then((data) => setResults(Array.isArray(data) ? data : [])).catch(() => setResults([])); }, []);
  useEffect(() => {
    if (!reservationExpiresAt || now < reservationExpiresAt) return;
    setReservationExpiresAt(null);
    setCart([]);
    setCheckoutOpen(false);
    setNotice("\u0e2b\u0e21\u0e14\u0e40\u0e27\u0e25\u0e32\u0e08\u0e2d\u0e07\u0e41\u0e25\u0e49\u0e27 \u0e2a\u0e25\u0e32\u0e01\u0e16\u0e39\u0e01\u0e04\u0e37\u0e19\u0e2a\u0e15\u0e47\u0e2d\u0e01");
    lotteryApi.tickets().then((data) => setInventory(data.map((ticket) => ({ id: ticket._id, drawId: String(ticket.drawId?._id || ticket.drawId || ""), drawLabel: ticket.drawId?.label || "", number: ticket.number, price: ticket.price, set: ticket.setCode || ticket.series || "\u0e2a\u0e25\u0e32\u0e01" })))).catch(() => null);
    setTimeout(() => setNotice(""), 4000);
  }, [now, reservationExpiresAt]);

  useEffect(() => {
    const removedIds = previousCartIds.current.filter((id) => !cart.some((ticket) => ticket.id === id));
    removedIds.filter(isStoredTicket).forEach((ticketId) => lotteryApi.removeFromCart(ownerKey, ticketId).catch(() => null));
    previousCartIds.current = cart.map((ticket) => ticket.id);
  }, [cart, ownerKey]);
  const shown = useMemo(() => {
    const birthdayParts = birthday ? birthday.split("-") : [];
    const related = birthdayParts.length === 3 ? [birthdayParts[2].slice(-2) + birthdayParts[1] + birthdayParts[0], birthdayParts[0] + birthdayParts[1] + birthdayParts[2].slice(-2), birthdayParts[0] + birthdayParts[1], birthdayParts[1] + birthdayParts[0]] : [];
    let filtered = inventory.filter((ticket) => {
      if (query && !ticket.number.includes(query)) return false;
      if (filter === "0" || filter === "9") if (!ticket.number.endsWith(filter)) return false;
      if (filter === "11" && !/(\d)\1/.test(ticket.number)) return false;
      if (priceMin !== "" && ticket.price < Number(priceMin)) return false;
      if (priceMax !== "" && ticket.price > Number(priceMax)) return false;
      if (filterBySet && ticket.set !== filterBySet) return false;
      if ((suffix.length === 2 || suffix.length === 3) && !ticket.number.endsWith(suffix)) return false;
      if (related.length && !related.some((part) => ticket.number.includes(part))) return false;
      return true;
    });
    filtered.sort((a, b) => sortBy === "price_asc" ? a.price - b.price || a.number.localeCompare(b.number) : sortBy === "price_desc" ? b.price - a.price || a.number.localeCompare(b.number) : sortBy === "number_desc" ? b.number.localeCompare(a.number) : a.number.localeCompare(b.number));
    const groups = new Map();
    filtered.forEach((ticket) => {
      const key = `${ticket.drawId || "demo"}:${ticket.number}`;
      if (!groups.has(key)) groups.set(key, { id: key, number: ticket.number, price: ticket.price, set: ticket.set, copies: [] });
      const group = groups.get(key); group.price = Math.min(group.price, ticket.price); group.copies.push(ticket);
    });
    return [...groups.values()];
  }, [birthday, filter, filterBySet, inventory, priceMax, priceMin, query, sortBy, suffix]);
  const pageSize = 16;
  const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
  const paged = shown.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [birthday, filter, filterBySet, priceMax, priceMin, query, sortBy, suffix]);
  const isStoredTicket = (id) => /^[a-f\d]{24}$/i.test(String(id));
  const add = async (ticketOrTickets) => {
    const selectedTickets = Array.isArray(ticketOrTickets) ? ticketOrTickets : [ticketOrTickets];
    for (const ticket of selectedTickets) await addOne(ticket);
  };
  const addOne = async (ticket) => {
    if (cart.some((item) => item.id === ticket.id)) return;
    try {
      // Initial sample tickets have numeric IDs. Send only MongoDB ticket IDs to the API.
      if (isStoredTicket(ticket.id)) { const saved = await lotteryApi.addToCart(ownerKey, ticket.id); setReservationExpiresAt(saved.expiresAt ? new Date(saved.expiresAt) : null); }
      else setReservationExpiresAt(new Date(Date.now() + 10 * 60 * 1000));
      setCart((current) => [...current, ticket]);
      setNotice(`จองเลข ${ticket.number} แล้ว`);
      setTimeout(() => setNotice(""), 2200);
    } catch (error) { setNotice(error.message); }
  };
  const remove = async (ticket) => {
    try {
      if (isStoredTicket(ticket.id)) await lotteryApi.removeFromCart(ownerKey, ticket.id);
      setCart((current) => current.filter((item) => item.id !== ticket.id));
      setNotice(`นำเลข ${ticket.number} ออกจากตะกร้าแล้ว`);
      setTimeout(() => setNotice(""), 2200);
    } catch (error) { setNotice(error.message); }
  };
  const total = cart.reduce((sum, ticket) => sum + ticket.price, 0);
  const reservationTimer = reservationExpiresAt ? timeUntil(reservationExpiresAt, now) : null;
  const draw = nextDraw(now); const countdown = timeUntil(draw.date, now);
  const searchWheelResult = (number) => { setFilter(""); setQuery(number); };
  const filters = [{ label: "ทั้งหมด", value: "" }, { label: "เลขลงท้าย 0", value: "0" }, { label: "เลขลงท้าย 9", value: "9" }, { label: "เลขเบิ้ล", value: "11" }];
  return <><header className="sticky top-0 z-30 border-b border-stone-200/80 bg-cream/90 backdrop-blur"><div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5"><a href="#top" className="font-['DM_Sans'] text-xl font-semibold tracking-widest">✦ LUCKY <span className="text-amber-600">SIX</span></a><nav className="hidden gap-8 text-sm md:flex"><a href="#tickets">เลือกสลาก</a><a href="#how">วิธีสั่งซื้อ</a><a href="#results">ตรวจผลรางวัล</a></nav><div className="flex items-center gap-2"><button type="button" onClick={() => setDarkMode((current) => !current)} aria-label={darkMode ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด"} title={darkMode ? "ธีมสว่าง" : "ธีมมืด"} className="grid h-10 w-10 place-items-center rounded-full border border-stone-300 bg-white text-ink transition hover:bg-amber-100">{darkMode ? <Sun size={17} /> : <Moon size={17} />}</button><button onClick={() => setDrawer(true)} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm text-white"><ShoppingBag size={16} />ตะกร้า <b className="min-w-6 rounded-full bg-white px-1.5 text-center font-['DM_Sans'] font-bold leading-6 text-slate-900">{cart.length}</b></button></div></div></header>
    <main id="top"><section className="hero-shell relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-12 overflow-hidden px-5 py-18 md:flex-row md:py-24"><div className="relative z-10 max-w-2xl"><p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-amber-700">งวดถัดไป • {draw.label}</p><h1 className="font-['DM_Sans'] text-5xl font-bold leading-[.95] tracking-tight sm:text-7xl">เลขที่ใช่<br /><span className="text-amber-600">อาจเป็นของคุณ</span></h1><p className="mt-7 max-w-xl text-base leading-8 text-slate-600">เลือกสลากกินแบ่งรัฐบาลจากเลขที่คุณชอบ จองใส่ตะกร้า และจัดการประวัติคำสั่งซื้อได้ในที่เดียว</p><a href="#tickets" className="hero-cta mt-8 inline-flex items-center gap-5 rounded-lg bg-ink px-5 py-4 text-sm font-bold text-white shadow-lg shadow-slate-300/40 transition hover:-translate-y-0.5">เลือกเลขของคุณ <ArrowDown size={17} /></a><div className="mt-8 flex flex-wrap gap-5 text-xs text-slate-600"><span><Check className="mr-1 inline text-emerald-600" size={14} />คัดเลือกสลากจริง</span><span><ShieldCheck className="mr-1 inline text-emerald-600" size={14} />ชำระเงินปลอดภัย</span></div></div><aside className="hero-draw-card relative z-10 w-full max-w-sm rounded-2xl bg-[#153f70] p-8 text-white shadow-[16px_17px_0_#f4dfb9]"><div className="mb-8 flex items-center justify-between"><Sparkles className="text-amber-300" /><span className="rounded-full border border-blue-300/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-blue-100">Next draw</span></div><p className="text-xs text-blue-200">งวดประจำวันที่</p><h2 className="mt-1 text-3xl font-bold">{draw.label}</h2><hr className="my-6 border-blue-400/60" /><p className="text-xs text-blue-200">ปิดรับจองใน</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-['DM_Sans'] text-3xl font-bold"><span>{String(countdown.days).padStart(2, "0")}<small className="ml-1 text-xs font-normal text-blue-200">วัน</small></span><span>{String(countdown.hours).padStart(2, "0")}<small className="ml-1 text-xs font-normal text-blue-200">ชม.</small></span><span>{String(countdown.minutes).padStart(2, "0")}<small className="ml-1 text-xs font-normal text-blue-200">นาที</small></span><span>{String(countdown.seconds).padStart(2, "0")}<small className="ml-1 text-xs font-normal text-blue-200">วินาที</small></span></div><div className="mt-7 flex items-center gap-2 text-xs text-blue-100"><span className="h-2 w-2 rounded-full bg-emerald-400" />เปิดรับจองสลากอยู่</div></aside></section>
    <section className="grid grid-cols-3 border-y border-amber-200 bg-[#f8efd9] px-5 py-7 text-center"><div><b className="block font-['DM_Sans'] text-xl">6,000,000</b><span className="text-xs text-stone-600">รางวัลที่ 1 ในข้อมูลตัวอย่าง</span></div><div><b className="block font-['DM_Sans'] text-xl">80 บาท</b><span className="text-xs text-stone-600">ราคาอ้างอิงต่อใบ · รายการเป็นข้อมูลจำลอง</span></div><div><b className="block font-['DM_Sans'] text-xl">10 นาที</b><span className="text-xs text-stone-600">เวลาจองในตะกร้า</span></div></section><Wheel onSearch={searchWheelResult} tickets={inventory} />
    <section id="tickets" className="mx-auto max-w-6xl px-5 py-16">
  <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-amber-700">เลือกเลขนำโชค</p><h2 className="text-3xl font-bold">สลากพร้อมให้เลือก</h2></div><label className="flex w-full max-w-xs items-center gap-2 border-b border-ink pb-2"><Search size={17} /><input value={query} onChange={(event) => { setFilter(""); setQuery(event.target.value.replace(/\D/g, "").slice(0, 6)); }} maxLength="6" placeholder="ค้นหาเลขที่ชอบ" className="w-full bg-transparent text-sm outline-none" /></label></div>
  <div className="mb-5 flex flex-wrap gap-2">{filters.map((item) => <button key={item.value} onClick={() => { setFilter(item.value); setQuery(""); }} className={`rounded-full border px-4 py-2 text-xs ${filter === item.value ? "border-ink bg-ink text-white" : "border-stone-300 text-slate-600"}`}>{item.label}</button>)}</div>
  <div className="mb-7 grid gap-3 rounded-xl border border-stone-200 bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-5">
    <label className="text-xs font-semibold text-slate-600">ราคาต่ำสุด<input type="number" min="80" value={priceMin} onChange={(event) => setPriceMin(event.target.value)} placeholder="80" className="mt-1 w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm" /></label>
    <label className="text-xs font-semibold text-slate-600">ราคาสูงสุด<input type="number" min="80" value={priceMax} onChange={(event) => setPriceMax(event.target.value)} placeholder="ไม่จำกัด" className="mt-1 w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm" /></label>
    <label className="text-xs font-semibold text-slate-600">ชุดที่<select value={filterBySet} onChange={(event) => setFilterBySet(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm"><option value="">ทุกชุด</option>{[...new Set(inventory.map((item) => item.set))].map((set) => <option key={set} value={set}>{set}</option>)}</select></label>
    <label className="text-xs font-semibold text-slate-600">เลขท้าย 2 หรือ 3 ตัว<input inputMode="numeric" maxLength="3" value={suffix} onChange={(event) => setSuffix(event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="เช่น 24 หรือ 624" className="mt-1 w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm" /></label>
    <label className="text-xs font-semibold text-slate-600">ค้นหาเลขวันเกิด<input type="date" value={birthday} onChange={(event) => setBirthday(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm" /></label>
    <label className="text-xs font-semibold text-slate-600 sm:col-span-2 lg:col-span-2">เรียงลำดับ<select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-transparent px-3 py-2 text-sm"><option value="number_asc">เลขน้อยไปมาก</option><option value="number_desc">เลขมากไปน้อย</option><option value="price_asc">ราคาต่ำไปสูง</option><option value="price_desc">ราคาสูงไปต่ำ</option></select></label>
    <p className="self-end pb-2 text-xs text-slate-500">ค้นหารูปแบบ วันเดือนปี และปีเดือนวัน</p>
  </div>
  <div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span>พบ {shown.length} รายการเลข</span><span>หน้า {Math.min(page, pageCount)} / {pageCount}</span></div>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{paged.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} drawLabel={draw.label} onAdd={add} onDetails={setDetail} selectedIds={new Set(cart.map((item) => item.id))} />)}</div>
  {!shown.length && <p className="py-16 text-center text-slate-500">ไม่พบเลขที่ตรงกับตัวกรอง ลองปรับเงื่อนไขค้นหา</p>}
  {pageCount > 1 && <div className="mt-8 flex items-center justify-center gap-3"><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-40">ก่อนหน้า</button><span className="text-sm text-slate-600">{page} / {pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-lg border border-stone-300 px-4 py-2 text-sm disabled:opacity-40">ถัดไป</button></div>}
</section>
    <PrizeChecker draws={results} /><ResultsSection results={results} /><section id="how" className="mx-auto max-w-6xl px-5 pb-20"><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">ง่ายใน 3 ขั้นตอน</p><h2 className="mt-2 text-3xl font-bold">เลือกเลขอย่างมั่นใจ</h2><div className="mt-7 grid gap-4 md:grid-cols-3">{[["01","เลือกเลขที่ชอบ","ค้นหาเลขมงคล หรือเลือกจากสลากที่พร้อมขาย"],["02","จองในตะกร้า","เลขของคุณจะถูกจองไว้ 10 นาที เพื่อให้ชำระได้ทัน"],["03","ชำระและรอลุ้น","เก็บประวัติสลาก พร้อมตรวจผลได้ในที่เดียว"]].map(([no,title,text]) => <article key={no} className="rounded-xl bg-slate-100 p-7"><b className="font-['DM_Sans'] text-amber-700">{no}</b><h3 className="mt-7 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div></section>    <section id="demo-stats" className="mx-auto max-w-6xl px-5 pb-16"><div className="rounded-2xl border border-amber-300 bg-amber-50 p-6"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">สถิติตัวอย่าง · ข้อมูลจำลอง</p><h2 className="mt-2 text-2xl font-bold">ตัวเลขประกอบการสาธิต</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-white p-5"><b className="block font-['DM_Sans'] text-3xl">1,280</b><span className="text-sm text-slate-600">บัญชีตัวอย่าง · ไม่ใช่จำนวนผู้ซื้อจริง</span></div><div className="rounded-xl bg-white p-5"><b className="block font-['DM_Sans'] text-3xl">24 งวด</b><span className="text-sm text-slate-600">ข้อมูลตัวอย่าง · ไม่ใช่สถิติผลประกอบการ</span></div></div></div></section>
    {informationPages.map((page) => <section key={page.id} id={page.id} className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-16"><div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9"><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">ข้อมูลสำหรับเว็บไซต์สาธิต</p><h2 className="mt-2 text-3xl font-bold">{page.title}</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{page.intro}</p><div className="mt-6 grid gap-4 md:grid-cols-2">{page.sections.map(([heading, body]) => <article key={heading} className="rounded-xl bg-slate-50 p-5"><h3 className="font-bold">{heading}</h3><p className="mt-2 text-sm leading-7 text-slate-600">{body}</p></article>)}</div>{page.id === "about" && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">LUCKY SIX ไม่ใช่สำนักงานสลากกินแบ่งรัฐบาล และไม่ได้อ้างว่าได้รับการรับรองหรือเป็นตัวแทนของหน่วยงานดังกล่าว</p>}</div></section>)}
    <section id="faq" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-16"><div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9"><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">ข้อมูลจำลอง</p><h2 className="mt-2 text-3xl font-bold">คำถามที่พบบ่อย</h2><div className="mt-6 space-y-3"><details className="rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer font-bold">ชำระเงินหรือซื้อสลากจริงได้หรือไม่?</summary><p className="mt-3 text-sm leading-7 text-slate-600">ไม่ได้ ระบบนี้เป็นการสาธิต ขั้นตอนชำระเงินและคำสั่งซื้อเป็นข้อมูลจำลอง ไม่มีการรับเงินจริง</p></details><details className="rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer font-bold">ข้อมูลบริษัทและใบอนุญาตเป็นข้อมูลจริงหรือไม่?</summary><p className="mt-3 text-sm leading-7 text-slate-600">ไม่ใช่ เป็นข้อมูลตัวอย่างที่สร้างขึ้นเพื่อทดสอบหน้าจอ และใช้ยืนยันตัวตนหรือสิทธิจำหน่ายไม่ได้</p></details><details className="rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer font-bold">เว็บไซต์นี้เกี่ยวข้องกับสำนักงานสลากกินแบ่งรัฐบาลหรือไม่?</summary><p className="mt-3 text-sm leading-7 text-slate-600">ไม่เกี่ยวข้อง ไม่ใช่เว็บไซต์หรือบริการของสำนักงานสลากกินแบ่งรัฐบาล</p></details></div></div></section>
    <section id="contact" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20"><div className="rounded-2xl bg-[#153f70] p-6 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">ข้อมูลติดต่อจำลอง · ใช้งานติดต่อจริงไม่ได้</p><h2 className="mt-2 text-3xl font-bold">ติดต่อเรา</h2><p className="mt-3 text-sm leading-7 text-blue-100">ข้อมูลด้านล่างเป็นตัวอย่างประกอบหน้าจอ ไม่ใช่ข้อมูลนิติบุคคลหรือช่องทางติดต่อที่ใช้งานได้</p><dl className="mt-6 grid gap-4 sm:grid-cols-2">{[["ชื่อบริษัท (สมมติ)", demoContact.company], ["เลขใบอนุญาต (ตัวอย่าง)", demoContact.license], ["เบอร์โทรศัพท์ (จำลอง)", demoContact.phone], ["อีเมล (ตัวอย่าง)", demoContact.email]].map(([label, value]) => <div key={label} className="rounded-xl bg-white/10 p-4"><dt className="text-xs text-blue-200">{label} · ข้อมูลจำลอง</dt><dd className="mt-1 font-semibold">{value}</dd></div>)}</dl></div></section></main>
    <footer className="bg-ink px-5 py-10 text-blue-100"><div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-4 text-sm md:flex-row"><a href="#top" className="font-['DM_Sans'] tracking-widest text-white">✦ LUCKY SIX</a><p>เว็บไซต์ตัวอย่างเพื่อสาธิตระบบเท่านั้น</p><p className="max-w-sm text-xs">ไม่ใช่เว็บไซต์หรือบริการของสำนักงานสลากกินแบ่งรัฐบาล และไม่มีการรับชำระเงินจริง</p></div><nav aria-label="ลิงก์ข้อมูลเว็บไซต์" className="mt-7 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/15 pt-5 text-xs"><a href="#about" className="hover:text-amber-300">เกี่ยวกับเรา</a><a href="#privacy" className="hover:text-amber-300">นโยบายความเป็นส่วนตัว</a><a href="#terms" className="hover:text-amber-300">เงื่อนไขการใช้งาน</a><a href="#refund" className="hover:text-amber-300">นโยบายคืนเงิน</a><a href="#faq" className="hover:text-amber-300">คำถามที่พบบ่อย</a><a href="#contact" className="hover:text-amber-300">ติดต่อเรา</a></nav><p className="mt-6 text-xs text-amber-200">ข้อมูลบริษัท ใบอนุญาต เบอร์โทร อีเมล และสถิติทั้งหมดเป็นข้อมูลจำลอง · ห้ามจำหน่ายแก่ผู้มีอายุต่ำกว่า 20 ปี · โปรดเล่นอย่างมีสติ</p></div></footer>
    {notice && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-5 py-3 text-sm text-white shadow-xl">{notice}</div>}
    {drawer && <><button aria-label="ปิดตะกร้า" onClick={() => setDrawer(false)} className="fixed inset-0 z-40 cursor-default bg-slate-950/45" /><aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-700">รายการที่เลือก</p><h2 className="mt-1 text-2xl font-bold">ตะกร้าของคุณ</h2></div><button onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100"><X size={19} /></button></div><div className="mt-6 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><Clock3 size={14} className="mr-1 inline" />เวลาจองคงเหลือ {reservationTimer ? <b>{String(reservationTimer.minutes).padStart(2, "0")}:{String(reservationTimer.seconds).padStart(2, "0")}</b> : "10:00"} นาที</div><div className="flex-1 overflow-auto">{cart.length ? cart.map((ticket) => <div key={ticket.id} className="flex items-center justify-between border-b py-5"><div><b className="font-['DM_Sans'] text-xl tracking-widest">{ticket.number}</b><span className="mt-1 block text-xs text-slate-500">งวด 16 ก.ย. 2569 · {ticket.set}</span></div><div className="text-right"><b>{baht(ticket.price)}</b><button onClick={() => setCart(cart.filter((item) => item.id !== ticket.id))} className="mt-1 block text-xs text-red-500">ลบ</button></div></div>) : <div className="grid h-full place-items-center text-center text-sm text-slate-500"><Ticket className="mx-auto mb-3 text-slate-300" size={35} />ยังไม่มีสลากในตะกร้า</div>}</div><div className="border-t pt-4"><div className="mb-4 flex justify-between"><span className="text-sm text-slate-500">ยอดรวม</span><b className="font-['DM_Sans'] text-2xl">{baht(total)}</b></div><button onClick={() => setCheckoutOpen(true)} disabled={!cart.length} className="w-full rounded-lg bg-ink py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">ดำเนินการชำระเงิน <ArrowRight size={16} className="ml-1 inline" /></button></div></aside></>}
    {checkoutOpen && <CheckoutPanel cart={cart} total={total} ownerKey={ownerKey} onClose={() => setCheckoutOpen(false)} onSuccess={(order) => { setCheckoutOpen(false); setDrawer(false); setCart([]); setReservationExpiresAt(null); setReceipt(order); lotteryApi.tickets().then((data) => setInventory(data.map((ticket) => ({ id: ticket._id, drawId: String(ticket.drawId?._id || ticket.drawId || ""), drawLabel: ticket.drawId?.label || "", number: ticket.number, price: ticket.price, set: ticket.setCode || ticket.series || "\u0e2a\u0e25\u0e32\u0e01" })))).catch(() => null); }} />}
    {detail && <><button onClick={() => setDetail(null)} aria-label="ปิดรายละเอียด" className="fixed inset-0 z-[70] bg-slate-950/55" /><section role="dialog" aria-modal="true" aria-label="รายละเอียดสลาก" className="fixed inset-x-4 top-1/2 z-[75] mx-auto max-h-[90vh] max-w-lg -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-amber-700">รายละเอียดสลาก</p><h2 className="mt-1 text-3xl font-bold tracking-widest">{detail.number}</h2></div><button onClick={() => setDetail(null)} aria-label="ปิด" className="rounded-full bg-slate-100 p-2"><X size={18} /></button></div><div className="mt-5 space-y-3 rounded-xl bg-amber-50 p-4 text-sm"><p>งวด: {draw.label}</p><p>ชุด: {detail.copies.map((copy) => copy.set).join(" / ")}</p><p>จำนวนสลากเลขนี้: {detail.copies.length} ใบ</p><p className="font-bold text-amber-700">ราคาเริ่มต้น {baht(detail.price)} / ใบ</p></div><p className="mt-4 text-xs leading-6 text-slate-500">สลากจะถูกจองเมื่อเพิ่มลงตะกร้า และรายการที่จองแล้วไม่สามารถถูกจองซ้ำได้</p><div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => add(detail.copies[0])} className="rounded-lg bg-[#dc2626] py-3 text-sm font-bold text-white">ซื้อ 1 ใบ</button>{detail.copies.length > 1 && <button onClick={() => add(detail.copies.slice(0, 2))} className="rounded-lg bg-ink py-3 text-sm font-bold text-white">ซื้อเป็นคู่</button>}</div></section></>}
    {receipt && <><button onClick={() => setReceipt(null)} aria-label="ปิด" className="fixed inset-0 z-[80] bg-slate-950/55" /><section className="fixed inset-x-4 top-1/2 z-[90] mx-auto max-h-[90vh] max-w-lg -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={28} /></div><h2 className="mt-3 text-2xl font-bold">ยืนยันคำสั่งซื้อสำเร็จ</h2><p className="mt-1 text-sm text-slate-500">ชำระเงินแบบจำลอง</p></div><div className="mt-5 rounded-xl border border-dashed border-slate-300 p-4"><p className="text-xs text-slate-500">เลขคำสั่งซื้อ</p><b className="text-lg">{receipt.orderNo}</b><p className="mt-1 text-xs text-slate-500">{new Date(receipt.createdAt || Date.now()).toLocaleString("th-TH")}</p><p className="mt-2 text-sm text-slate-600">ช่องทางชำระเงิน: {{ promptpay: "PromptPay QR", bank_transfer: "โอนผ่านธนาคาร", credit_card: "บัตรเครดิต", truemoney: "TrueMoney Wallet" }[receipt.paymentMethod] || receipt.paymentMethod}</p></div><div className="mt-4 space-y-2">{receipt.items?.map((item, index) => <div key={index} className="flex justify-between border-b pb-2 text-sm"><span className="font-mono tracking-widest">{item.number}</span><b>{baht(item.price)}</b></div>)}</div><div className="mt-4 flex justify-between text-lg"><span>ยอดรวม</span><b>{baht(receipt.total)}</b></div><p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs">ใบเสร็จจำลอง ไม่ใช่หลักฐานการชำระเงิน</p><button onClick={() => setReceipt(null)} className="mt-5 w-full rounded-lg bg-ink py-3 font-bold text-white">เสร็จสิ้น</button></section></>}
    <UserPanel />
    <AdminPanel />
    <AdminTicketPanel />
  </>;
}
