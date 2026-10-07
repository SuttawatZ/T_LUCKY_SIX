const test = require("node:test");
const assert = require("node:assert/strict");
const { getBangkokCutoff, saleIsOpen, SALE_CUTOFF_LOCAL_TIME, TIME_ZONE } = require("../src/config/draw-config");

test("draw cutoff fallback is 15:00 in Asia/Bangkok", () => {
  assert.equal(TIME_ZONE, "Asia/Bangkok");
  assert.equal(SALE_CUTOFF_LOCAL_TIME, "15:00");
  assert.equal(getBangkokCutoff(new Date("2026-10-15T17:00:00.000Z")).toISOString(), "2026-10-16T08:00:00.000Z");
});

test("sales use the single 15:00 Bangkok cutoff even if the stored end time differs", () => {
  const draw = {
    status: "open",
    drawDate: new Date("2026-10-16T03:00:00.000Z"),
    saleStartAt: new Date("2026-10-01T08:00:00.000Z"),
    saleEndAt: new Date("2026-10-16T08:00:00.000Z"),
  };
  draw.saleEndAt = new Date("2026-10-16T16:59:59.000Z");
  assert.equal(saleIsOpen(draw, new Date("2026-10-16T07:59:59.999Z")), true);
  assert.equal(saleIsOpen(draw, new Date("2026-10-16T08:00:00.000Z")), false);
  assert.equal(saleIsOpen({ ...draw, status: "announced" }, new Date("2026-10-16T07:00:00.000Z")), false);
});
