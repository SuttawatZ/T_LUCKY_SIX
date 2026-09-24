const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    method: { type: String, enum: ["promptpay", "card", "bank_transfer"], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending", index: true },
    providerReference: { type: String, trim: true, sparse: true, unique: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
