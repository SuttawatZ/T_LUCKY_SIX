export const prizeAmounts = {
  firstPrize: 6000000,
  nearbyFirstPrize: 100000,
  secondPrize: 200000,
  thirdPrize: 80000,
  fourthPrize: 40000,
  fifthPrize: 20000,
  frontThreeDigits: 4000,
  lastThreeDigits: 4000,
  lastTwoDigits: 2000,
};

export const prizeLabels = {
  firstPrize: "รางวัลที่ 1",
  nearbyFirstPrize: "เลขข้างเคียงรางวัลที่ 1",
  secondPrize: "รางวัลที่ 2",
  thirdPrize: "รางวัลที่ 3",
  fourthPrize: "รางวัลที่ 4",
  fifthPrize: "รางวัลที่ 5",
  frontThreeDigits: "เลขหน้า 3 ตัว",
  lastThreeDigits: "เลขท้าย 3 ตัว",
  lastTwoDigits: "เลขท้าย 2 ตัว",
};

export function getPrizeMatches(number, results = {}) {
  if (!/^\d{6}$/.test(String(number || "")) || !results?.firstPrize) return [];
  const matches = [];
  const add = (key) => matches.push({ key, label: prizeLabels[key], amount: prizeAmounts[key] });
  const winningNumber = String(results.firstPrize).padStart(6, "0");
  if (String(number) === winningNumber) add("firstPrize");

  const firstValue = Number(winningNumber);
  const adjacent = [String((firstValue + 999999) % 1000000).padStart(6, "0"), String((firstValue + 1) % 1000000).padStart(6, "0")];
  if (adjacent.includes(String(number))) add("nearbyFirstPrize");

  ["secondPrize", "thirdPrize", "fourthPrize", "fifthPrize"].forEach((key) => {
    if ((results[key] || []).map(String).includes(String(number))) add(key);
  });
  if ((results.frontThreeDigits || []).map(String).some((digits) => String(number).startsWith(digits))) add("frontThreeDigits");
  if ((results.lastThreeDigits || []).map(String).some((digits) => String(number).endsWith(digits))) add("lastThreeDigits");
  if ((results.lastTwoDigits || []).map(String).some((digits) => String(number).endsWith(digits))) add("lastTwoDigits");
  return matches;
}
