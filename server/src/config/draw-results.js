const REQUIRED_RESULT_COUNTS = {
  secondPrize: 5,
  thirdPrize: 10,
  fourthPrize: 50,
  fifthPrize: 100,
  frontThreeDigits: 2,
  lastThreeDigits: 2,
  lastTwoDigits: 1,
};

function hasCompleteResults(results = {}) {
  if (!/^\d{6}$/.test(String(results.firstPrize || ""))) return false;
  return Object.entries(REQUIRED_RESULT_COUNTS).every(([key, count]) => {
    const digits = key === "lastTwoDigits" ? 2 : key === "frontThreeDigits" || key === "lastThreeDigits" ? 3 : 6;
    const values = results[key];
    return Array.isArray(values) && values.length === count && values.every((value) => new RegExp(`^\\d{${digits}}$`).test(String(value)));
  });
}

module.exports = { REQUIRED_RESULT_COUNTS, hasCompleteResults };
