require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Draw = require("../models/draw.model");
const Ticket = require("../models/ticket.model");

const numbers = ["019284","155090","228811","336729","403009","568956","709118","818284","927700","110011","290519","645192","081624","190745","224680","317459","420168","509327","630491","748205","871036","990261","012345","100001","123789","222908","316416","428997","517247","609112","734567","856140","945023","054321","162834","273945","384056","495167","506278","617389","728490","839501","940612","051723","163845","274956","385067","496178","507289","618390","729401","830512","941623","052734","164856","275967","386078","497189","508290","619401","720512","831623","942734","063845","174956","285067","396178","407289","518390","629401"];

async function seed() {
  await connectDB();
  await Draw.deleteOne({ drawDate: new Date("2026-09-01T10:00:00+07:00"), label: "งวด 1 กันยายน 2569" });
  const drawDate = new Date("2026-09-16T10:00:00+07:00");
  const draw = await Draw.findOneAndUpdate({ drawDate }, { $set: { status: "announced", results: { firstPrize: "730640", lastTwoDigits: ["64"], frontThreeDigits: ["060", "521"], lastThreeDigits: ["041", "266"] } }, $setOnInsert: { label: "งวด 16 กันยายน 2569", drawDate, saleStartAt: new Date(), saleEndAt: new Date("2026-09-15T23:59:59+07:00") } }, { new: true, upsert: true });
  await Ticket.bulkWrite(numbers.map((number, index) => ({ updateOne: { filter: { drawId: draw._id, number, series: `ชุด ${String(index + 1).padStart(2, "0")}`, setCode: "" }, update: { $setOnInsert: { drawId: draw._id, number, series: `ชุด ${String(index + 1).padStart(2, "0")}`, setCode: "", price: [80, 100, 120, 140][index % 4], faceValue: 80, status: "available" } }, upsert: true } })));
    const nextDrawDate = new Date("2026-10-01T10:00:00+07:00");
    const nextDraw = await Draw.findOneAndUpdate(
      { drawDate: nextDrawDate },
      { $set: { status: "open", saleStartAt: new Date(), saleEndAt: new Date("2026-09-30T23:59:59+07:00") }, $setOnInsert: { label: "งวด 1 ตุลาคม 2569", drawDate: nextDrawDate } },
      { new: true, upsert: true }
    );
    await Ticket.bulkWrite(numbers.map((number, index) => ({ updateOne: { filter: { drawId: nextDraw._id, number, series: `ชุด ${String(index + 1).padStart(2, "0")}`, setCode: "" }, update: { $setOnInsert: { drawId: nextDraw._id, number, series: `ชุด ${String(index + 1).padStart(2, "0")}`, setCode: "", price: [80, 100, 120, 140][index % 4], faceValue: 80, status: "available" } }, upsert: true } })));
  console.log(`Seeded ${numbers.length} tickets for ${draw.label}`);
    console.log(`Seeded ${numbers.length} tickets for ${nextDraw.label}`);
  await mongoose.disconnect();
}
seed().catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exit(1); });
