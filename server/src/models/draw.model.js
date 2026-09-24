const mongoose = require("mongoose");

const drawSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    drawDate: { type: Date, required: true, unique: true, index: true },
    saleStartAt: { type: Date, required: true },
    saleEndAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["upcoming", "open", "closed", "announced"],
      default: "upcoming",
      index: true,
    },
    prizeInfo: {
      firstPrize: { type: Number, default: 6000000 },
      lastTwoDigits: { type: Number, default: 2000 },
    },
    results: {
      firstPrize: { type: String, match: /^\d{6}$/ },
      lastTwoDigits: { type: [String], default: [] },
      frontThreeDigits: { type: [String], default: [] },
      lastThreeDigits: { type: [String], default: [] },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Draw", drawSchema);
