const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { getJwtSecret } = require("../config/auth");

const safeUser = (user) => ({ id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role, dateOfBirth: user.dateOfBirth, kycStatus: user.kycStatus, addresses: user.addresses, createdAt: user.createdAt });
const signToken = (user) => {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), { expiresIn: "7d" });
};
const authResponse = (user) => ({ token: signToken(user), user: safeUser(user) });

const register = async (req, res, next) => {
  try {
    const { name, phone, email, password, dateOfBirth } = req.body;
    if (!name || !phone || !password || !dateOfBirth) return res.status(400).json({ message: "กรุณากรอกชื่อ เบอร์โทร รหัสผ่าน และวันเกิด" });
    if (String(password).length < 8) return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    const exists = await User.exists({ $or: [{ phone }, ...(email ? [{ email: String(email).toLowerCase() }] : [])] });
    if (exists) return res.status(409).json({ message: "เบอร์โทรหรืออีเมลนี้ถูกใช้งานแล้ว" });
    const user = await User.create({ name, phone, email, dateOfBirth, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json(authResponse(user));
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ message: "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" });
    res.json(authResponse(user));
  } catch (error) { next(error); }
};

const getMe = (req, res) => res.json({ user: safeUser(req.user) });

const updateMe = async (req, res, next) => {
  try {
    const allowed = ["name", "email", "dateOfBirth"];
    allowed.forEach((key) => { if (req.body[key] !== undefined) req.user[key] = req.body[key]; });
    await req.user.save();
    res.json({ user: safeUser(req.user) });
  } catch (error) { next(error); }
};

const addAddress = async (req, res, next) => {
  try {
    const { label, recipient, phone, line1, subdistrict, district, province, postalCode, isDefault } = req.body;
    if (!recipient || !phone || !line1 || !province || !postalCode) return res.status(400).json({ message: "กรุณากรอกข้อมูลที่อยู่ให้ครบ" });
    if (isDefault) req.user.addresses.forEach((address) => { address.isDefault = false; });
    req.user.addresses.push({ label, recipient, phone, line1, subdistrict, district, province, postalCode, isDefault: isDefault || req.user.addresses.length === 0 });
    await req.user.save();
    res.status(201).json({ addresses: req.user.addresses });
  } catch (error) { next(error); }
};

const deleteAddress = async (req, res, next) => {
  try {
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || !req.user.addresses[index]) return res.status(404).json({ message: "ไม่พบที่อยู่" });
    req.user.addresses.splice(index, 1);
    await req.user.save();
    res.json({ addresses: req.user.addresses });
  } catch (error) { next(error); }
};

const listUsers = async (req, res, next) => {
  try {
    const keyword = String(req.query.q || "").trim();
    const filter = keyword ? { $or: [{ name: { $regex: keyword, $options: "i" } }, { phone: { $regex: keyword } }, { email: { $regex: keyword, $options: "i" } }] } : {};
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 50, 100));
    res.json({ users: users.map(safeUser) });
  } catch (error) { next(error); }
};

const updateUserByAdmin = async (req, res, next) => {
  try {
    const allowed = ["name", "phone", "email", "dateOfBirth", "role", "kycStatus"];
    const updates = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
    if (!Object.keys(updates).length) return res.status(400).json({ message: "ไม่มีข้อมูลสำหรับแก้ไข" });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "ไม่พบบัญชีผู้ใช้" });
    res.json({ user: safeUser(user) });
  } catch (error) { next(error); }
};

module.exports = { register, login, getMe, updateMe, addAddress, deleteAddress, listUsers, updateUserByAdmin };
