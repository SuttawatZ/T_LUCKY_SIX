import { useMemo, useState } from "react";
import { Search, Trophy } from "lucide-react";
import { getPrizeMatches, prizeAmounts, prizeLabels } from "./prizeUtils";

const money = (amount) => `${Number(amount).toLocaleString("th-TH")} บาท`;
const prizeTiers = [
  ["firstPrize", 1], ["nearbyFirstPrize", 2], ["secondPrize", 5], ["thirdPrize", 10], ["fourthPrize", 50], ["fifthPrize", 100],
  ["frontThreeDigits", 2], ["lastThreeDigits", 2], ["lastTwoDigits", 1],
];

function valuesFor(key, results) {
  if (key === "firstPrize") return results.firstPrize ? [String(results.firstPrize).padStart(6, "0")] : [];
  if (key === "nearbyFirstPrize") {
    if (!results.firstPrize) return [];
    const number = Number(results.firstPrize);
    return [String((number + 999999) % 1000000).padStart(6, "0"), String((number + 1) % 1000000).padStart(6, "0")];
  }
  return (results[key] || []).map(String);
}

export default function PrizeChecker({ draws = [] }) {
  const [selectedId, setSelectedId] = useState(""); const [rawNumbers, setRawNumbers] = useState("");
  const selectedDraw = draws.find((draw) => String(draw._id) === String(selectedId)) || draws[0];
  const numbers = useMemo(() => rawNumbers.split(/[\s,;]+/).map((value) => value.trim()).filter((value) => /^\d{6}$/.test(value)).slice(0, 10), [rawNumbers]);
  const prizeChecks = numbers.map((number) => ({ number, matches: getPrizeMatches(number, selectedDraw?.results) }));
  const total = prizeChecks.reduce((sum, check) => sum + check.matches.reduce((sub, match) => sub + match.amount, 0), 0);
  const results = selectedDraw?.results || {};

  return <section id="results" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-16">
    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">ตรวจสลาก</p><h2 className="mt-2 text-3xl font-bold">ตรวจผลรางวัล</h2><p className="mt-2 text-sm text-slate-600">กรอกเลขสลากได้สูงสุด 10 ใบ ผลจะแสดงทันทีตามงวดที่เลือก</p></div>
    {!draws.length ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">ยังไม่มีงวดที่ประกาศผล</p> : <>
      <label className="block max-w-sm text-sm font-medium">เลือกงวด<select value={selectedDraw?._id || ""} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-ink"><option value="">งวดล่าสุด: {draws[0].label}</option>{draws.map((draw) => <option key={draw._id} value={draw._id}>{draw.label}</option>)}</select></label>
      <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><label className="flex items-center gap-2 font-bold"><Search size={17} />เลขสลาก 6 หลัก</label><textarea value={rawNumbers} onChange={(event) => setRawNumbers(event.target.value.replace(/[^\d\s,;]/g, ""))} rows={7} placeholder="กรอกทีละเลข เช่น&#10;123456&#10;012345" className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-lg tracking-widest text-ink outline-none focus:ring-2 focus:ring-amber-300" /><p className="mt-2 text-xs text-slate-500">ตรวจได้ {numbers.length}/10 ใบ เลขที่ยังไม่ครบ 6 หลักจะยังไม่ถูกตรวจ</p>
          {!!numbers.length && <div className="mt-4 space-y-3">{prizeChecks.map(({ number, matches }) => <article key={number} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between"><b className="font-mono text-lg tracking-widest">{number}</b>{matches.length ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">ถูกรางวัล</span> : <span className="text-xs text-slate-500">ไม่ถูกรางวัล</span>}</div>{!!matches.length && <p className="mt-2 text-sm">{matches.map((match) => `${match.label} (${money(match.amount)})`).join(" · ")}</p>}</article>)}</div>}
          {!!numbers.length && <div className="mt-4 flex justify-between border-t pt-3"><b>ยอดรางวัลรวม</b><b className="text-lg text-amber-700">{money(total)}</b></div>}
        </div>
        <div className="rounded-2xl bg-[#242936] p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-amber-300">ผลรางวัลตามประกาศ</p><h3 className="mt-1 text-xl font-bold">{selectedDraw.label}</h3></div><Trophy className="text-amber-300" /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{prizeTiers.map(([key, count]) => { const values = valuesFor(key, results); return <article key={key} className="rounded-xl bg-white/10 p-3"><div className="flex items-start justify-between gap-2"><b className="text-sm">{prizeLabels[key]}</b><span className="shrink-0 text-xs text-amber-200">{money(prizeAmounts[key])}</span></div><p className="mt-2 break-words font-mono text-sm tracking-wider">{values.length ? values.join(" · ") : "ยังไม่มีข้อมูล"}</p><p className="mt-1 text-[10px] text-slate-300">{key === "nearbyFirstPrize" ? "2 รางวัล" : `${count} รางวัล`}</p></article>; })}</div></div>
      </div>
    </>}
  </section>;
}
