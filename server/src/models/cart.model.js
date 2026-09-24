const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
    number: { type: String, required: true, match: /^\d{6}$/ },
    drawId: { type: mongoose.Schema.Types.ObjectId, ref: "Draw", required: true },
    priceSnapshot: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    ownerKey: { type: String, required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
