const { getBangkokCutoff } = require("./draw-config");

const numbered = (start, count) => Array.from({ length: count }, (_, index) => String(start + index).padStart(6, "0"));

const DEMO_RESULT_DRAWS = [
  {
    label: "งวด 16 กันยายน 2569",
    drawDate: new Date("2026-09-16T10:00:00+07:00"),
    saleStartAt: new Date("2026-09-01T15:00:00+07:00"),
    status: "announced",
    results: {
      firstPrize: "730640",
      secondPrize: numbered(100001, 5),
      thirdPrize: numbered(200001, 10),
      fourthPrize: numbered(300001, 50),
      fifthPrize: numbered(400001, 100),
      frontThreeDigits: ["060", "521"],
      lastThreeDigits: ["041", "266"],
      lastTwoDigits: ["64"],
    },
  },
  {
    label: "งวด 1 ตุลาคม 2569",
    drawDate: new Date("2026-10-01T10:00:00+07:00"),
    saleStartAt: new Date("2026-09-16T15:00:00+07:00"),
    status: "announced",
    results: {
      firstPrize: "482193",
      secondPrize: numbered(500001, 5),
      thirdPrize: numbered(510001, 10),
      fourthPrize: numbered(520001, 50),
      fifthPrize: numbered(530001, 100),
      frontThreeDigits: ["103", "847"],
      lastThreeDigits: ["219", "675"],
      lastTwoDigits: ["38"],
    },
  },
].map((draw) => ({ ...draw, saleEndAt: getBangkokCutoff(draw.drawDate), isDemo: true }));

module.exports = { DEMO_RESULT_DRAWS };
