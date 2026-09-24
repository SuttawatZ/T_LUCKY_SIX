const test = require("node:test");
const assert = require("node:assert/strict");
const { requireRole } = require("../src/middlewares/auth.middleware");

const response = () => ({ code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; } });

test("admin role can continue to administration endpoint", () => {
  let advanced = false;
  requireRole("admin")({ user: { role: "admin" } }, response(), () => { advanced = true; });
  assert.equal(advanced, true);
});

test("customer role is rejected from administration endpoint", () => {
  const res = response();
  requireRole("admin")({ user: { role: "customer" } }, res, assert.fail);
  assert.equal(res.code, 403);
  assert.match(res.body.message, /ไม่มีสิทธิ์/);
});
