require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/user.model");

async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_PHONE, ADMIN_PASSWORD, ADMIN_EMAIL } = process.env;
  if (!ADMIN_NAME || !ADMIN_PHONE || !ADMIN_PASSWORD) throw new Error("Set ADMIN_NAME, ADMIN_PHONE and ADMIN_PASSWORD in .env first");
  if (ADMIN_PASSWORD.length < 8) throw new Error("ADMIN_PASSWORD must contain at least 8 characters");
  await connectDB();
  const user = await User.findOneAndUpdate(
    { phone: ADMIN_PHONE },
    { $set: { name: ADMIN_NAME, email: ADMIN_EMAIL || undefined, role: "admin", dateOfBirth: new Date("1990-01-01"), passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12) } },
    { new: true, upsert: true, runValidators: true }
  );
  console.log(`Admin ready: ${user.phone}`);
  await mongoose.disconnect();
}
seedAdmin().catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exit(1); });
