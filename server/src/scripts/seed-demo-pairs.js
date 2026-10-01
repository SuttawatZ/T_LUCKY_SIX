require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Draw = require("../models/draw.model");
const Ticket = require("../models/ticket.model");

const drawDate = new Date("2026-10-01T10:00:00+07:00");
const samplePairs = [
  { number: "777777", series: "คู่สาธิต 777777 ชุด A", setCode: "คู่สาธิต A" },
  { number: "777777", series: "คู่สาธิต 777777 ชุด B", setCode: "คู่สาธิต B" },
  { number: "888888", series: "คู่สาธิต 888888 ชุด A", setCode: "คู่สาธิต A" },
  { number: "888888", series: "คู่สาธิต 888888 ชุด B", setCode: "คู่สาธิต B" },
];

async function seedDemoPairs() {
  await connectDB();
  const draw = await Draw.findOneAndUpdate(
    { drawDate },
    {
      $set: { label: "งวด 1 ตุลาคม 2569" },
      $setOnInsert: {
        drawDate,
        saleStartAt: new Date("2026-09-16T15:00:00+07:00"),
        saleEndAt: new Date("2026-10-01T15:00:00+07:00"),
        status: "open",
      },
    },
    { new: true, upsert: true }
  );

  const operations = samplePairs.map(({ number, series, setCode }) => ({
    updateOne: {
      filter: { drawId: draw._id, number, series, setCode },
      update: {
        $set: { price: 100, faceValue: 80 },
        // Keep a ticket's reserved/sold state intact when this script is rerun.
        $setOnInsert: { drawId: draw._id, number, series, setCode, status: "available" },
      },
      upsert: true,
    },
  }));
  await Ticket.bulkWrite(operations);

  console.log(`Added/verified ${samplePairs.length} demo tickets for ${draw.label}`);
  console.log("Numbers: 777777 (2 copies), 888888 (2 copies); 100 baht each.");
}

seedDemoPairs()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
