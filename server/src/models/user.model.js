const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    recipient: { type: String, trim: true },
    phone: { type: String, trim: true },
    line1: { type: String, trim: true },
    subdistrict: { type: String, trim: true },
    district: { type: String, trim: true },
    province: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true, index: true },
    email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "staff", "admin"], default: "customer" },
    dateOfBirth: { type: Date, required: true },
    kycStatus: { type: String, enum: ["unverified", "pending", "verified", "rejected"], default: "unverified" },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
