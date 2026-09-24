const crypto = require("crypto");
const Cart = require("../models/cart.model");
const Draw = require("../models/draw.model");
const Ticket = require("../models/ticket.model");
const Order = require("../models/order.model");

const RESERVATION_MINUTES = 10;
const cartExpiry = () => new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

const releaseExpiredReservations = async () => {
  await Ticket.updateMany(
    { status: "reserved", reservedUntil: { $lte: new Date() } },
    { $set: { status: "available", reservedBy: null, reservedUntil: null } }
  );
};

const getDraws = async (req, res, next) => {
  try { res.json(await Draw.find().sort({ drawDate: 1 })); } catch (error) { next(error); }
};

const getDashboard = async (req, res, next) => {
  try {
    const draw = await Draw.findOne({ status: { $in: ["open", "upcoming"] } }).sort({ drawDate: 1 });
    if (!draw) return res.status(404).json({ message: "ไม่พบงวดที่เปิดจำหน่าย" });
    const availableTickets = await Ticket.countDocuments({ drawId: draw._id, status: "available" });
    res.json({ draw, availableTickets, reservationMinutes: RESERVATION_MINUTES });
  } catch (error) { next(error); }
};

const getResults = async (req, res, next) => {
  try {
    const draws = await Draw.find({ status: "announced" }).sort({ drawDate: -1 }).limit(12);
    res.json(draws);
  } catch (error) { next(error); }
};

const getTickets = async (req, res, next) => {
  try {
    await releaseExpiredReservations();
    const filter = { status: "available" };
    if (req.query.drawId) filter.drawId = req.query.drawId;
    if (req.query.number) filter.number = { $regex: req.query.number.replace(/[^0-9]/g, "") };
    const tickets = await Ticket.find(filter).sort({ number: 1 }).limit(Math.min(Number(req.query.limit) || 24, 100));
    res.json(tickets);
  } catch (error) { next(error); }
};

const createTicket = async (req, res, next) => {
  try {
    const { drawId, number, series = "", setCode = "", price = 80, faceValue = 80 } = req.body;
    if (!drawId || !/^\d{6}$/.test(String(number || ""))) return res.status(400).json({ message: "กรุณาระบุงวดและเลขสลาก 6 หลัก" });
    if (!Number.isFinite(Number(price)) || Number(price) < 80) return res.status(400).json({ message: "ราคาสลากต้องไม่น้อยกว่า 80 บาท" });
    const draw = await Draw.findById(drawId);
    if (!draw) return res.status(404).json({ message: "ไม่พบงวดสลาก" });
    if (!["open", "upcoming"].includes(draw.status)) return res.status(409).json({ message: "งวดนี้ไม่เปิดรับเพิ่มสลาก" });
    const ticket = await Ticket.create({ drawId, number: String(number), series, setCode, price: Number(price), faceValue: Number(faceValue) || 80 });
    res.status(201).json({ ticket });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "เลขสลากนี้มีอยู่แล้วในงวดและชุดเดียวกัน กรุณาเปลี่ยนเลขหรือระบุชุดใหม่" });
    next(error);
  }
};

const listAdminTickets = async (req, res, next) => {
  try {
    const filter = req.query.drawId ? { drawId: req.query.drawId } : {};
    const tickets = await Ticket.find(filter).populate("drawId", "label drawDate status").sort({ createdAt: -1 }).limit(200);
    res.json({ tickets });
  } catch (error) { next(error); }
};

const updateTicket = async (req, res, next) => {
  try {
    const allowed = ["number", "series", "setCode", "price", "faceValue", "status"];
    const updates = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
    if (updates.number && !/^\d{6}$/.test(String(updates.number))) return res.status(400).json({ message: "เลขสลากต้องมี 6 หลัก" });
    if (updates.price !== undefined && Number(updates.price) < 80) return res.status(400).json({ message: "ราคาสลากต้องไม่น้อยกว่า 80 บาท" });
    const ticket = await Ticket.findOneAndUpdate({ _id: req.params.id }, { $set: updates }, { new: true, runValidators: true });
    if (!ticket) return res.status(404).json({ message: "ไม่พบสลากที่ต้องการแก้ไข" });
    res.json({ ticket });
  } catch (error) { next(error); }
};

const deleteTicket = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOneAndDelete({ _id: req.params.id });
    if (!ticket) return res.status(404).json({ message: "ไม่พบสลากที่ต้องการลบ" });
    res.status(204).end();
  } catch (error) { next(error); }
};

const listOrders = async (req, res, next) => {
  try { res.json({ orders: await Order.find().sort({ createdAt: -1 }).limit(200) }); } catch (error) { next(error); }
};

const approvePayment = async (req, res, next) => {
  try {
    const order = await Order.findOneAndUpdate({ _id: req.params.id, paymentStatus: "pending" }, { $set: { paymentStatus: "paid", status: "paid" } }, { new: true });
    if (!order) return res.status(409).json({ message: "ไม่พบคำสั่งซื้อที่รอชำระเงิน" });
    res.json({ order });
  } catch (error) { next(error); }
};

const publishResults = async (req, res, next) => {
  try {
    const { firstPrize, lastTwoDigits, frontThreeDigits, lastThreeDigits } = req.body;
    if (!/^\d{6}$/.test(String(firstPrize || ""))) return res.status(400).json({ message: "รางวัลที่ 1 ต้องเป็นเลข 6 หลัก" });
    const lastTwo = Array.isArray(lastTwoDigits) ? lastTwoDigits : [lastTwoDigits];
    if (!lastTwo.length || lastTwo.some((number) => !/^\d{2}$/.test(String(number)))) return res.status(400).json({ message: "เลขท้าย 2 ตัวต้องมี 2 หลัก" });
    const frontThree = Array.isArray(frontThreeDigits) ? frontThreeDigits : [frontThreeDigits];
    const lastThree = Array.isArray(lastThreeDigits) ? lastThreeDigits : [lastThreeDigits];
    if (!frontThree.length || frontThree.some((number) => !/^\d{3}$/.test(String(number)))) return res.status(400).json({ message: "เลขหน้า 3 ตัวต้องมี 3 หลัก" });
    if (!lastThree.length || lastThree.some((number) => !/^\d{3}$/.test(String(number)))) return res.status(400).json({ message: "เลขท้าย 3 ตัวต้องมี 3 หลัก" });
    const draw = await Draw.findByIdAndUpdate(req.params.id, { $set: { "results.firstPrize": firstPrize, "results.lastTwoDigits": lastTwo, "results.frontThreeDigits": frontThree, "results.lastThreeDigits": lastThree, status: "announced" } }, { new: true, runValidators: true });
    if (!draw) return res.status(404).json({ message: "ไม่พบงวดสลาก" });
    res.json({ draw });
  } catch (error) { next(error); }
};

const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ ownerKey: req.params.ownerKey });
    res.json(cart || { ownerKey: req.params.ownerKey, items: [], expiresAt: null });
  } catch (error) { next(error); }
};

const addToCart = async (req, res, next) => {
  try {
    await releaseExpiredReservations();
    const { ownerKey, ticketId } = req.body;
    if (!ownerKey || !ticketId) return res.status(400).json({ message: "ownerKey and ticketId are required" });
    const until = cartExpiry();
    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, status: "available" },
      { $set: { status: "reserved", reservedBy: ownerKey, reservedUntil: until } },
      { new: true }
    );
    if (!ticket) return res.status(409).json({ message: "สลากใบนี้ถูกเลือกไปแล้ว" });
    const cart = await Cart.findOneAndUpdate(
      { ownerKey },
      { $set: { expiresAt: until }, $addToSet: { items: { ticketId: ticket._id, number: ticket.number, drawId: ticket.drawId, priceSnapshot: ticket.price } } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(cart);
  } catch (error) { next(error); }
};

const removeFromCart = async (req, res, next) => {
  try {
    const { ownerKey, ticketId } = req.body;
    const cart = await Cart.findOneAndUpdate({ ownerKey }, { $pull: { items: { ticketId } } }, { new: true });
    await Ticket.updateOne({ _id: ticketId, status: "reserved", reservedBy: ownerKey }, { $set: { status: "available", reservedBy: null, reservedUntil: null } });
    res.json(cart || { ownerKey, items: [] });
  } catch (error) { next(error); }
};

const createOrder = async (req, res, next) => {
  try {
    const { ownerKey, buyerName, buyerPhone } = req.body;
    const cart = await Cart.findOne({ ownerKey });
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: "ตะกร้าว่างเปล่า" });
    if (cart.expiresAt <= new Date()) return res.status(410).json({ message: "หมดเวลาจองสลากแล้ว" });
    const subtotal = cart.items.reduce((sum, item) => sum + item.priceSnapshot, 0);
    const order = await Order.create({
      orderNo: `LT-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      buyerName,
      buyerPhone,
      items: cart.items.map((item) => ({ ticketId: item.ticketId, number: item.number, drawId: item.drawId, price: item.priceSnapshot })),
      subtotal,
      total: subtotal,
    });
    await Ticket.updateMany({ _id: { $in: cart.items.map((item) => item.ticketId) }, status: "reserved", reservedBy: ownerKey }, { $set: { status: "sold", soldOrderId: order._id } });
    await Cart.deleteOne({ _id: cart._id });
    res.status(201).json(order);
  } catch (error) { next(error); }
};

module.exports = { getDraws, getDashboard, getResults, getTickets, createTicket, listAdminTickets, updateTicket, deleteTicket, listOrders, approvePayment, publishResults, getCart, addToCart, removeFromCart, createOrder };
