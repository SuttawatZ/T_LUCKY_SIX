import { useMemo, useState } from "react";
import { Search, Trophy } from "lucide-react";
import { getPrizeMatches, hasCompleteResults, prizeAmounts, prizeLabels } from "./prizeUtils";

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

export default function PrizeChecker({ draws = [], currentDraw, latestResultDraw, nextDraw, pendingResultDraw }) {
  const [selectedId, setSelectedId] = useState(""); const [rawNumbers, setRawNumbers] = useState("");
  const defaultDraw = latestResultDraw || draws[0] || currentDraw || pendingResultDraw;
  const selectedDraw = selectedId ? draws.find((draw) => String(draw._id) === String(selectedId)) || [currentDraw, pendingResultDraw].find((draw) => String(draw?._id) === selectedId) || null : defaultDraw;
  const isCurrentDraw = Boolean(selectedDraw && currentDraw && String(selectedDraw._id) === String(currentDraw._id));
  const isPendingResultDraw = Boolean(selectedDraw && pendingResultDraw && String(selectedDraw._id) === String(pendingResultDraw._id));
  const announced = selectedDraw?.status === "announced" && hasCompleteResults(selectedDraw?.results);
  const incompleteResults = selectedDraw?.status === "announced" && !announced;
  const numbers = useMemo(() => rawNumbers.split(/[\s,;]+/).map((value) => value.trim()).filter((value) => /^\d{6}$/.test(value)).slice(0, 10), [rawNumbers]);
  const prizeChecks = numbers.map((number) => ({ number, matches: announced ? getPrizeMatches(number, selectedDraw.results) : [] }));
  const total = prizeChecks.reduce((sum, check) => sum + check.matches.reduce((sub, match) => sub + match.amount, 0), 0);
  const results = selectedDraw?.results || {};
  const availableDraws = [...new Map([...(currentDraw ? [currentDraw] : []), ...(pendingResultDraw ? [pendingResultDraw] : []), ...draws].map((draw) => [String(draw._id), draw])).values()].sort((a, b) => new Date(b.drawDate) - new Date(a.drawDate));
  const announcementDate = currentDraw || nextDraw || pendingResultDraw;

  return <section id="results" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-16">
    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-amber-700">ตรวจสลาก</p><h2 className="mt-2 text-3xl font-bold">ตรวจผลรางวัล</h2><p className="mt-2 text-sm text-slate-600">เลือกงวดที่ออกผลล่าสุดหรือเลือกงวดปัจจุบันเพื่อตรวจภายหลัง</p></div>
    {!selectedDraw ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">ยังไม่มีข้อมูลงวดสำหรับตรวจรางวัล</p> : <>
      <label className="block max-w-sm text-sm font-medium">เลือกงวด<select value={selectedId || defaultDraw?._id || ""} onChange={(event) => setSelectedId(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-ink">{latestResultDraw && <option value={latestResultDraw._id}>งวดที่ออกผลล่าสุด · {latestResultDraw.label}</option>}{currentDraw && <option value={currentDraw._id}>งวดปัจจุบัน · {currentDraw.label}</option>}{pendingResultDraw && <option value={pendingResultDraw._id}>ปิดขาย · รอประกาศผล · {pendingResultDraw.label}</option>}{availableDraws.filter((draw) => draw.status === "announced" && String(draw._id) !== String(latestResultDraw?._id)).map((draw) => <option key={draw._id} value={draw._id}>งวดที่ผ่านมาแล้ว · {draw.label}</option>)}</select></label>
      {(isCurrentDraw || isPendingResultDraw) && !announced && <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">รอประกาศผลวันที่ {new Date(selectedDraw.drawDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" })} ขณะนี้ยังไม่สามารถตัดสินผลถูกรางวัลได้</p>}
      {incompleteResults && <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">ข้อมูลงวดนี้ยังไม่ครบ จึงยังไม่ตัดสินว่าถูกรางวัลหรือไม่</p>}
      {!isCurrentDraw && announced && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-600">งวดที่ผ่านมาแล้ว · กำลังตรวจ {selectedDraw.label}</p>}
      {announcementDate && <p className="mt-2 text-xs text-slate-500">งวดถัดไปจะประกาศผลวันที่ {new Date(announcementDate.drawDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" })}</p>}
      <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">กำลังตรวจงวด: <b>{selectedDraw.label}</b></p>
      <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><label className="flex items-center gap-2 font-bold"><Search size={17} />เลขสลาก 6 หลัก</label><textarea value={rawNumbers} onChange={(event) => setRawNumbers(event.target.value.replace(/[^\d\s,;]/g, ""))} rows={7} placeholder="กรอกทีละเลข เช่น&#10;123456&#10;012345" className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-lg tracking-widest text-ink outline-none focus:ring-2 focus:ring-amber-300" /><p className="mt-2 text-xs text-slate-500">ตรวจได้ {numbers.length}/10 ใบ เลขที่ยังไม่ครบ 6 หลักจะยังไม่ถูกตรวจ</p>
          {announced && !!numbers.length && <><div className="mt-4 space-y-3">{prizeChecks.map(({ number, matches }) => <article key={number} className="rounded-xl bg-slate-50 p-3"><div className="flex items-center justify-between"><b className="font-mono text-lg tracking-widest">{number}</b>{matches.length ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">ถูกรางวัล</span> : <span className="text-xs text-slate-500">ไม่ถูกรางวัล</span>}</div>{!!matches.length && <p className="mt-2 text-sm">{matches.map((match) => `${match.label} (${money(match.amount)})`).join(" · ")}</p>}</article>)}</div><div className="mt-4 flex justify-between border-t pt-3"><b>ยอดรางวัลรวม</b><b className="text-lg text-amber-700">{money(total)}</b></div></>}
          {!announced && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">ยังไม่แสดงผลถูกหรือไม่ถูกจนกว่าจะมีผลรางวัลของงวดนี้</p>}
        </div>
        <div className="rounded-2xl bg-[#242936] p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-amber-300">{announced ? "ผลรางวัลตามประกาศ" : "รอประกาศผล"}</p><h3 className="mt-1 text-xl font-bold">{selectedDraw.label}</h3>{selectedDraw.isDemo && <span className="mt-2 inline-block rounded-full bg-amber-300 px-2 py-1 text-[10px] font-bold text-ink">ข้อมูลจำลอง</span>}</div><Trophy className="text-amber-300" /></div>{announced ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{prizeTiers.map(([key, count]) => { const values = valuesFor(key, results); return <article key={key} className="rounded-xl bg-white/10 p-3"><div className="flex items-start justify-between gap-2"><b className="text-sm">{prizeLabels[key]}</b><span className="shrink-0 text-xs text-amber-200">{money(prizeAmounts[key])}</span></div><p className="mt-2 break-words font-mono text-sm tracking-wider">{values.length ? values.join(" · ") : "ยังไม่มีข้อมูล"}</p><p className="mt-1 text-[10px] text-slate-300">{key === "nearbyFirstPrize" ? "2 รางวัล" : `${count} รางวัล`}</p></article>; })}</div> : <p className="mt-4 rounded-xl bg-white/10 p-4 text-sm text-blue-100">จะเปิดตรวจเมื่อผู้ดูแลบันทึกผลของงวดนี้</p>}</div>
      </div>
    </>}
  </section>;
}
