const test = require("node:test");
const assert = require("node:assert/strict");
const { hasCompleteResults } = require("../src/config/draw-results");

const fullResults = {
  firstPrize: "123456",
  secondPrize: Array.from({ length: 5 }, (_, index) => String(index).padStart(6, "0")),
  thirdPrize: Array.from({ length: 10 }, (_, index) => String(index + 10).padStart(6, "0")),
  fourthPrize: Array.from({ length: 50 }, (_, index) => String(index + 20).padStart(6, "0")),
  fifthPrize: Array.from({ length: 100 }, (_, index) => String(index + 70).padStart(6, "0")),
  frontThreeDigits: ["123", "456"],
  lastThreeDigits: ["234", "567"],
  lastTwoDigits: ["56"],
};

test("only complete prize results can be used to determine ticket outcomes", () => {
  assert.equal(hasCompleteResults(fullResults), true);
  assert.equal(hasCompleteResults({ firstPrize: "730640", lastTwoDigits: ["64"] }), false);
  assert.equal(hasCompleteResults({ ...fullResults, frontThreeDigits: ["123"] }), false);
});
