const TIME_ZONE = "Asia/Bangkok";
const SALE_CUTOFF_LOCAL_TIME = "15:00";

function getBangkokDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  return Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
}

function ageAtLeast20(value, now = new Date()) {
  const birth = String(value instanceof Date ? value.toISOString() : value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return false;
  const today = getBangkokDateParts(now);
  const todayString = `${today.year}-${today.month}-${today.day}`;
  if (birth > todayString) return false;
  return Number(today.year) - Number(birth.slice(0, 4)) - (todayString.slice(5) < birth.slice(5) ? 1 : 0) >= 20;
}

function getBangkokCutoff(drawDate) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(drawDate);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const [hours, minutes] = SALE_CUTOFF_LOCAL_TIME.split(":").map(Number);
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), hours - 7, minutes));
}

function saleIsOpen(draw, now = new Date()) {
  if (!draw || !["open", "upcoming"].includes(draw.status)) return false;
  const cutoff = getBangkokCutoff(draw.drawDate);
  return (!draw.saleStartAt || new Date(draw.saleStartAt) <= now) && new Date(cutoff) > now;
}

module.exports = { TIME_ZONE, SALE_CUTOFF_LOCAL_TIME, getBangkokCutoff, saleIsOpen, getBangkokDateParts, ageAtLeast20 };
