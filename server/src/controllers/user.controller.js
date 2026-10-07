const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Order = require("../models/order.model");
const { getJwtSecret } = require("../config/auth");
const { ageAtLeast20 } = require("../config/draw-config");

const safeUser = (user) => ({ id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role, dateOfBirth: user.dateOfBirth, ageConfirmedAt: user.ageConfirmedAt, ageVerified: ageAtLeast20(user.dateOfBirth), kycStatus: user.kycStatus, addresses: user.addresses, createdAt: user.createdAt });
const signToken = (user) => {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, getJwtSecret(), { expiresIn: "7d" });
};
const authResponse = (user) => ({ token: signToken(user), user: safeUser(user) });

const register = async (req, res, next) => {
  try {
    const { name, phone, email, password, dateOfBirth } = req.body;
    const normalizedPhone = String(phone || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!name || (!normalizedPhone && !normalizedEmail) || !password || !dateOfBirth) return res.status(400).json({ message: "กรุณากรอกชื่อ ช่องทางติดต่อ รหัสผ่าน และวันเกิด" });
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ message: "รูปแบบอีเมลไม่ถูกต้อง" });
    if (normalizedPhone && !/^[0-9+()\-\s]{8,20}$/.test(normalizedPhone)) return res.status(400).json({ message: "รูปแบบเบอร์โทรไม่ถูกต้อง" });
    if (!ageAtLeast20(dateOfBirth) || req.body.ageConfirmed !== true) return res.status(400).json({ message: "ผู้สมัครต้องมีอายุ 20 ปีขึ้นไปและยืนยันอายุ" });
    if (String(password).length < 8) return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    const exists = await User.exists({ $or: [...(normalizedPhone ? [{ phone: normalizedPhone }] : []), ...(normalizedEmail ? [{ email: normalizedEmail }] : [])] });
    if (exists) return res.status(409).json({ message: "เบอร์โทรหรืออีเมลนี้ถูกใช้งานแล้ว" });
    const user = await User.create({ name, phone: normalizedPhone || undefined, email: normalizedEmail || undefined, dateOfBirth, ageConfirmedAt: new Date(), passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json(authResponse(user));
  } catch (error) { next(error); }
};

const login = async (req, res, next) => {
  try {
    const { identifier, phone, password } = req.body;
    const loginId = String(identifier || phone || "").trim();
    const user = await User.findOne({ $or: [{ phone: loginId }, { email: loginId.toLowerCase() }] }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ message: "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" });
    res.json(authResponse(user));
  } catch (error) { next(error); }
};

const getMe = (req, res) => res.json({ user: safeUser(req.user) });

const listMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).populate("items.drawId", "label").lean();
    for (const order of orders) for (const item of order.items || []) item.drawLabel = item.drawLabel || item.drawId?.label;
    res.json({ orders });
  } catch (error) { next(error); }
};

const listMyTickets = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id, paymentStatus: "paid" }).sort({ createdAt: -1 }).populate("items.drawId", "label drawDate status results").lean();
    const tickets = orders.flatMap((order) => (order.items || []).map((item) => ({ ...item, drawLabel: item.drawId?.label, drawStatus: item.drawId?.status, results: item.drawId?.results, drawId: item.drawId?._id, orderNo: order.orderNo, purchasedAt: order.createdAt })));
    res.json({ tickets });
  } catch (error) { next(error); }
};

const updateMe = async (req, res, next) => {
  try {
    const effectiveDateOfBirth = req.body.dateOfBirth ?? req.user.dateOfBirth;
    if (req.body.dateOfBirth !== undefined && !ageAtLeast20(req.body.dateOfBirth)) return res.status(400).json({ message: "ต้องมีอายุ 20 ปีขึ้นไปจึงใช้บัญชีเพื่อสั่งซื้อได้" });
    if (!ageAtLeast20(req.user.dateOfBirth) && req.body.ageConfirmed !== true) return res.status(400).json({ message: "กรุณากรอกวันเกิดและยืนยันว่ามีอายุ 20 ปีขึ้นไป" });
    if (req.body.ageConfirmed === true && ageAtLeast20(effectiveDateOfBirth)) req.user.ageConfirmedAt = req.user.ageConfirmedAt || new Date();
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

module.exports = { register, login, getMe, listMyOrders, listMyTickets, updateMe, addAddress, deleteAddress, listUsers, updateUserByAdmin };
