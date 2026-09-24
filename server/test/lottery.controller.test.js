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
  const draw = { _id: "draw-1", label: "งวด 16 กันยายน 2569" };
  const originalFindOne = Draw.findOne;
  const originalCount = Ticket.countDocuments;
  Draw.findOne = () => ({ sort: async () => draw });
  Ticket.countDocuments = async (filter) => { assert.deepEqual(filter, { drawId: "draw-1", status: "available" }); return 42; };
  const res = response();
  await controller.getDashboard({}, res, assert.fail);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.availableTickets, 42);
  assert.equal(res.body.reservationMinutes, 10);
  Draw.findOne = originalFindOne;
  Ticket.countDocuments = originalCount;
});

test("dashboard reports a useful 404 when there is no active draw", async () => {
  const originalFindOne = Draw.findOne;
  Draw.findOne = () => ({ sort: async () => null });
  const res = response();
  await controller.getDashboard({}, res, assert.fail);
  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /ไม่พบงวด/);
  Draw.findOne = originalFindOne;
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
