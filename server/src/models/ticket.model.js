const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    drawId: { type: mongoose.Schema.Types.ObjectId, ref: "Draw", required: true, index: true },
    number: { type: String, required: true, match: /^\d{6}$/, index: true },
    series: { type: String, trim: true, default: "" },
    setCode: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0 },
    faceValue: { type: Number, default: 80, min: 0 },
    status: {
      type: String,
      enum: ["available", "reserved", "sold", "void"],
      default: "available",
      index: true,
    },
    reservedBy: { type: String, default: null },
    reservedUntil: { type: Date, default: null },
    soldOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ drawId: 1, number: 1, series: 1, setCode: 1 }, { unique: true });
ticketSchema.index({ drawId: 1, status: 1, number: 1 });

module.exports = mongoose.model("Ticket", ticketSchema);
