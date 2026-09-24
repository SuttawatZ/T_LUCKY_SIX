const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    buyerName: { type: String, required: true, trim: true },
    buyerPhone: { type: String, required: true, trim: true },
    items: [{ ticketId: mongoose.Schema.Types.ObjectId, number: String, drawId: mongoose.Schema.Types.ObjectId, price: Number }],
    subtotal: { type: Number, required: true, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending_payment", "paid", "fulfilled", "cancelled", "refunded"], default: "pending_payment", index: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
