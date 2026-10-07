require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Draw = require("../models/draw.model");
const Ticket = require("../models/ticket.model");
const { DEMO_CURRENT_DRAW_DATE, DEMO_CURRENT_DRAW_LABEL, DEMO_SALE_START_AT, DEMO_SALE_END_AT } = require("../config/demo-draw");
const { DEMO_RESULT_DRAWS } = require("../config/lottery-seed-data");

const numbers = ["019284","155090","228811","336729","403009","568956","709118","818284","927700","110011","290519","645192","081624","190745","224680","317459","420168","509327","630491","748205","871036","990261","012345","100001","123789","222908","316416","428997","517247","609112","734567","856140","945023","054321","162834","273945","384056","495167","506278","617389","728490","839501","940612","051723","163845","274956","385067","496178","507289","618390","729401","830512","941623","052734","164856","275967","386078","497189","508290","619401","720512","831623","942734","063845","174956","285067","396178","407289","518390","629401"];

async function seed({ connect = connectDB, DrawModel = Draw, TicketModel = Ticket } = {}) {
  await connect();
  let septemberDraw;
  for (const seedDraw of DEMO_RESULT_DRAWS) {
    const draw = await DrawModel.findOneAndUpdate(
      { drawDate: seedDraw.drawDate },
      { $set: { ...seedDraw, drawDate: seedDraw.drawDate } },
      { new: true, upsert: true, runValidators: true }
    );
    if (seedDraw.label === "งวด 16 กันยายน 2569") septemberDraw = draw;
    console.log(`Seeded complete demo results for ${draw.label}`);
  }

  const currentDraw = await DrawModel.findOneAndUpdate(
    { drawDate: DEMO_CURRENT_DRAW_DATE },
    { $set: { label: DEMO_CURRENT_DRAW_LABEL, drawDate: DEMO_CURRENT_DRAW_DATE, saleStartAt: DEMO_SALE_START_AT, saleEndAt: DEMO_SALE_END_AT, status: "open", isDemo: true } },
    { new: true, upsert: true, runValidators: true }
  );

  const ticketOperations = (drawId) => numbers.map((number, index) => ({
    updateOne: {
      filter: { drawId, number, series: `ชุด ${String(index + 1).padStart(2, "0")}`, setCode: "" },
      update: { $setOnInsert: { drawId, number, series: `ชุด ${String(index + 1).padStart(2, "0")}`, setCode: "", price: [80, 90, 100, 120][index % 4], faceValue: 80, status: "available" } },
      upsert: true,
    },
  }));

  await TicketModel.bulkWrite(ticketOperations(septemberDraw._id));
  await TicketModel.bulkWrite(ticketOperations(currentDraw._id));
  console.log(`Added/verified ${numbers.length} non-overwriting demo tickets for ${currentDraw.label}`);
}

if (require.main === module) {
  seed()
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(async () => { await mongoose.disconnect(); });
}

module.exports = { seed, numbers };
