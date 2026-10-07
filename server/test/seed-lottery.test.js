const test = require("node:test");
const assert = require("node:assert/strict");
const { seed, numbers } = require("../src/scripts/seed-lottery");
const { DEMO_CURRENT_DRAW_DATE } = require("../src/config/demo-draw");
const { hasCompleteResults } = require("../src/config/draw-results");

test("lottery seed upserts the three demo draws and preserves existing ticket state", async () => {
  const draws = [];
  const ticketBatches = [];
  let connected = false;
  const DrawModel = {
    async findOneAndUpdate(filter, update, options) {
      const draw = { _id: `draw-${draws.length + 1}`, ...update.$set };
      draws.push({ filter, update, options, draw });
      return draw;
    },
  };
  const TicketModel = { async bulkWrite(operations) { ticketBatches.push(operations); } };

  await seed({ connect: async () => { connected = true; }, DrawModel, TicketModel });

  assert.equal(connected, true);
  assert.equal(draws.length, 3);
  assert.deepEqual(draws.map(({ draw }) => draw.status), ["announced", "announced", "open"]);
  assert.equal(draws[0].draw.label, "งวด 16 กันยายน 2569");
  assert.equal(draws[1].draw.label, "งวด 1 ตุลาคม 2569");
  assert.equal(draws[2].draw.drawDate.toISOString(), DEMO_CURRENT_DRAW_DATE.toISOString());
  assert.ok(draws.slice(0, 2).every(({ draw }) => draw.isDemo && hasCompleteResults(draw.results)));
  assert.ok(draws.every(({ options }) => options.upsert === true));
  assert.equal(ticketBatches.length, 2);
  assert.ok(ticketBatches.every((batch) => batch.length === numbers.length && batch.every(({ updateOne }) => updateOne.upsert && updateOne.update.$setOnInsert.status === "available")));
  assert.ok(ticketBatches.flat().every(({ updateOne }) => !("$set" in updateOne.update)));
});
