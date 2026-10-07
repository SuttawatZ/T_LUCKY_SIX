const test = require("node:test");
const assert = require("node:assert/strict");

// Regression tests for the public lottery API contract. Database calls are mocked
// so they remain fast and can run without MongoDB.
const Draw = require("../src/models/draw.model");
const Ticket = require("../src/models/ticket.model");
const controller = require("../src/controllers/lottery.controller");

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

test("dashboard returns the next sale and inventory count", async () => {
  const draw = { _id: "draw-1", label: "งวด 16 กันยายน 2569", status: "open", saleStartAt: new Date(0), saleEndAt: new Date(Date.now() + 60_000), drawDate: new Date(Date.now() + 24 * 60 * 60 * 1000) };
  const originalFind = Draw.find;
  const originalCount = Ticket.countDocuments;
  Draw.find = () => ({ sort: async () => [draw] });
  Ticket.countDocuments = async (filter) => { assert.deepEqual(filter, { drawId: "draw-1", status: "available" }); return 42; };
  const res = response();
  await controller.getDashboard({}, res, assert.fail);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.availableTickets, 42);
  assert.equal(res.body.reservationMinutes, 10);
  Draw.find = originalFind;
  Ticket.countDocuments = originalCount;
});

test("dashboard reports a useful 404 when there is no active draw", async () => {
  const originalFind = Draw.find;
  Draw.find = () => ({ sort: async () => [] });
  const res = response();
  await controller.getDashboard({}, res, assert.fail);
  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /ปิดรับ รอเปิดงวดถัดไป/);
  Draw.find = originalFind;
});

test("current draw response separates the open draw from the latest published result", async () => {
  const current = { _id: "draw-current", label: "งวด 16 ตุลาคม 2569", status: "open", drawDate: new Date("2026-10-16T03:00:00Z"), saleStartAt: new Date("2026-10-01T08:00:00Z"), saleEndAt: new Date("2026-10-16T08:00:00Z") };
  const latest = { _id: "draw-latest", label: "งวด 16 กันยายน 2569", status: "announced", results: { firstPrize: "730640" } };
  const originalFind = Draw.find; const originalFindOne = Draw.findOne;
  Draw.find = () => ({ sort: async () => [current] });
  Draw.findOne = (filter) => ({ sort: async () => filter.status === "announced" ? latest : null });
  const res = response();
  await controller.getCurrentDraw({}, res, assert.fail);
  assert.equal(res.body.currentDraw._id, "draw-current");
  assert.equal(res.body.latestResultDraw._id, "draw-latest");
  assert.equal(res.body.saleOpen, true);
  assert.equal(res.body.timeZone, "Asia/Bangkok");
  Draw.find = originalFind; Draw.findOne = originalFindOne;
});

test("current draw response keeps a closed unpublished draw available for result checking", async () => {
  const pending = { _id: "draw-pending", label: "งวดที่ปิดขาย", status: "open", drawDate: new Date("2026-09-16T03:00:00Z"), saleStartAt: new Date("2026-09-01T08:00:00Z"), saleEndAt: new Date("2026-09-16T08:00:00Z") };
  const originalFind = Draw.find; const originalFindOne = Draw.findOne;
  Draw.find = () => ({ sort: async () => [pending] });
  Draw.findOne = () => ({ sort: async () => null });
  const res = response();
  await controller.getCurrentDraw({}, res, assert.fail);
  assert.equal(res.body.currentDraw, null);
  assert.equal(res.body.saleOpen, false);
  assert.equal(res.body.pendingResultDraw._id, "draw-pending");
  Draw.find = originalFind; Draw.findOne = originalFindOne;
});

test("current draw response ignores an older stale open draw when a newer sale exists", async () => {
  const old = { _id: "draw-oct-1", status: "open", drawDate: new Date("2026-10-01T03:00:00Z") };
  const current = { _id: "draw-oct-16", status: "open", drawDate: new Date("2026-10-16T03:00:00Z"), saleStartAt: new Date("2026-10-01T08:00:00Z") };
  const originalFind = Draw.find; const originalFindOne = Draw.findOne;
  Draw.find = () => ({ sort: async () => [current, old] });
  Draw.findOne = () => ({ sort: async () => null });
  const res = response();
  await controller.getCurrentDraw({}, res, assert.fail);
  assert.equal(res.body.currentDraw._id, "draw-oct-16");
  assert.equal(res.body.pendingResultDraw, null);
  Draw.find = originalFind; Draw.findOne = originalFindOne;
});

test("admin ticket creation rejects a number that is not six digits", async () => {
  const res = response();
  await controller.createTicket({ body: { drawId: "507f1f77bcf86cd799439011", number: "123" } }, res, assert.fail);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /6 หลัก/);
});

test("admin ticket creation stores a valid ticket for an open draw", async () => {
  const originalFindById = Draw.findById; const originalCreate = Ticket.create;
  Draw.findById = async () => ({ status: "open" });
  Ticket.create = async (data) => ({ _id: "ticket-1", ...data });
  const res = response();
  await controller.createTicket({ body: { drawId: "507f1f77bcf86cd799439011", number: "123456", price: 80 } }, res, assert.fail);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.ticket.number, "123456");
  Draw.findById = originalFindById; Ticket.create = originalCreate;
});

test("admin can update a ticket even when it is no longer available", async () => {
  const originalUpdate = Ticket.findOneAndUpdate;
  Ticket.findOneAndUpdate = async (filter, update, options) => {
    assert.deepEqual(filter, { _id: "ticket-2" });
    assert.equal(options.new, true);
    return { _id: "ticket-2", number: "654321", price: 100, status: "sold" };
  };
  const res = response();
  await controller.updateTicket({ params: { id: "ticket-2" }, body: { number: "654321", price: 100 } }, res, assert.fail);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ticket.number, "654321");
  Ticket.findOneAndUpdate = originalUpdate;
});

test("admin can delete a ticket even when it is already sold", async () => {
  const originalDelete = Ticket.findOneAndDelete;
  Ticket.findOneAndDelete = async (filter) => {
    assert.deepEqual(filter, { _id: "ticket-3" });
    return { _id: "ticket-3", status: "sold" };
  };
  const res = response();
  await controller.deleteTicket({ params: { id: "ticket-3" } }, res, assert.fail);
  assert.equal(res.statusCode, 204);
  Ticket.findOneAndDelete = originalDelete;
});

test("result publication rejects incomplete prize 2 to 5 lists", async () => {
  const res = response();
  await controller.publishResults({ params: { id: "draw-1" }, body: { firstPrize: "123456", secondPrize: ["000001"], lastTwoDigits: ["56"], frontThreeDigits: ["123"], lastThreeDigits: ["456"] } }, res, assert.fail);
  assert.equal(res.statusCode, 400);
});

test("result publication stores every required prize number", async () => {
  const originalUpdate = Draw.findByIdAndUpdate;
  const secondPrize = ["000001", "000002", "000003", "000004", "000005"];
  const thirdPrize = Array.from({ length: 10 }, (_, index) => String(index + 10).padStart(6, "0"));
  const fourthPrize = Array.from({ length: 50 }, (_, index) => String(index + 20).padStart(6, "0"));
  const fifthPrize = Array.from({ length: 100 }, (_, index) => String(index + 70).padStart(6, "0"));
  Draw.findByIdAndUpdate = async (_id, update, options) => {
    assert.deepEqual(update.$set["results.secondPrize"], secondPrize);
    assert.deepEqual(update.$set["results.thirdPrize"], thirdPrize);
    assert.deepEqual(update.$set["results.fourthPrize"], fourthPrize);
    assert.deepEqual(update.$set["results.fifthPrize"], fifthPrize);
    assert.equal(options.runValidators, true);
    return { _id: "draw-1", ...update.$set };
  };
  const res = response();
  await controller.publishResults({ params: { id: "draw-1" }, body: { firstPrize: "123456", secondPrize, thirdPrize, fourthPrize, fifthPrize, lastTwoDigits: ["56"], frontThreeDigits: ["123", "456"], lastThreeDigits: ["234", "567"] } }, res, assert.fail);
  assert.equal(res.statusCode, 200);
  Draw.findByIdAndUpdate = originalUpdate;
});

test("result publication rejects incomplete front and last digit prize lists", async () => {
  const res = response();
  const secondPrize = Array.from({ length: 5 }, (_, index) => String(index).padStart(6, "0"));
  const thirdPrize = Array.from({ length: 10 }, (_, index) => String(index + 10).padStart(6, "0"));
  const fourthPrize = Array.from({ length: 50 }, (_, index) => String(index + 20).padStart(6, "0"));
  const fifthPrize = Array.from({ length: 100 }, (_, index) => String(index + 70).padStart(6, "0"));
  await controller.publishResults({ params: { id: "draw-1" }, body: { firstPrize: "123456", secondPrize, thirdPrize, fourthPrize, fifthPrize, lastTwoDigits: ["56"], frontThreeDigits: ["123"], lastThreeDigits: ["456", "789"] } }, res, assert.fail);
  assert.equal(res.statusCode, 400);
});
