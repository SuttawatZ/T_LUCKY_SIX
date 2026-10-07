const crypto = require("crypto");
const Cart = require("../models/cart.model");
const Draw = require("../models/draw.model");
const Ticket = require("../models/ticket.model");
const Order = require("../models/order.model");
const { TIME_ZONE, SALE_CUTOFF_LOCAL_TIME, getBangkokCutoff, saleIsOpen, ageAtLeast20 } = require("../config/draw-config");
const { REQUIRED_RESULT_COUNTS } = require("../config/draw-results");

const RESERVATION_MINUTES = 10;
const cartExpiry = () => new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
const findCurrentDraw = async (now = new Date()) => {
  const candidates = await Draw.find({ status: { $in: ["open", "upcoming"] } }).sort({ drawDate: 1 });
  const draw = candidates.find((candidate) => saleIsOpen(candidate, now)) || null;
  if (draw) draw.saleEndAt = getBangkokCutoff(draw.drawDate);
  return draw;
};
const findNextScheduledDraw = async (now = new Date()) => {
  const candidates = await Draw.find({ status: { $in: ["open", "upcoming"] } }).sort({ drawDate: 1 });
  const draw = candidates.find((candidate) => getBangkokCutoff(candidate.drawDate) > now) || null;
  if (draw) draw.saleEndAt = getBangkokCutoff(draw.drawDate);
  return draw;
};
const findPendingResultsDraw = async (now = new Date(), newestRelevantDraw = null) => {
  const candidates = await Draw.find({ status: { $in: ["open", "upcoming"] }, "results.firstPrize": { $exists: false } }).sort({ drawDate: -1 });
  const boundary = newestRelevantDraw ? new Date(newestRelevantDraw.drawDate) : null;
  return candidates.find((draw) => getBangkokCutoff(draw.drawDate) <= now && (!boundary || new Date(draw.drawDate) > boundary)) || null;
};

const releaseExpiredReservations = async () => {
  await Ticket.updateMany(
    { status: "reserved", reservedUntil: { $lte: new Date() } },
    { $set: { status: "available", reservedBy: null, reservedUntil: null } }
  );
};

const getDraws = async (req, res, next) => {
  try { res.json(await Draw.find().sort({ drawDate: 1 })); } catch (error) { next(error); }
};

const getCurrentDraw = async (req, res, next) => {
  try {
    const now = new Date();
    const [currentDraw, latestResultDraw, nextScheduledDraw] = await Promise.all([
      findCurrentDraw(now),
      Draw.findOne({ status: "announced", "results.firstPrize": { $exists: true } }).sort({ drawDate: -1 }),
      findNextScheduledDraw(now),
    ]);
    const pendingResultDraw = await findPendingResultsDraw(now, currentDraw || nextScheduledDraw || latestResultDraw);
    const nextDraw = currentDraw || nextScheduledDraw;
    const saleOpen = saleIsOpen(currentDraw, now);
    res.json({ currentDraw, latestResultDraw, nextDraw, pendingResultDraw, saleOpen, serverNow: now.toISOString(), timeZone: TIME_ZONE, saleCutoff: SALE_CUTOFF_LOCAL_TIME });
  } catch (error) { next(error); }
};

const getDashboard = async (req, res, next) => {
  try {
    const draw = await findCurrentDraw();
    if (!draw) return res.status(404).json({ message: "ปิดรับ รอเปิดงวดถัดไป" });
    const availableTickets = await Ticket.countDocuments({ drawId: draw._id, status: "available" });
    res.json({ draw, availableTickets, reservationMinutes: RESERVATION_MINUTES, saleOpen: saleIsOpen(draw), timeZone: TIME_ZONE, saleCutoff: SALE_CUTOFF_LOCAL_TIME });
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
    const now = new Date();
    const filter = { status: "available" };
    if (req.query.drawId) filter.drawId = req.query.drawId;
    else {
      const currentDraw = await findCurrentDraw(now);
      if (!saleIsOpen(currentDraw, now)) return res.json([]);
      filter.drawId = currentDraw._id;
    }
    const numberConditions = [];
    const numberQuery = String(req.query.number || "").replace(/[^0-9]/g, "").slice(0, 6);
    if (numberQuery) numberConditions.push({ number: { $regex: numberQuery } });
    const price = {};
    if (Number.isFinite(Number(req.query.priceMin))) price.$gte = Number(req.query.priceMin);
    if (Number.isFinite(Number(req.query.priceMax))) price.$lte = Number(req.query.priceMax);
    if (Object.keys(price).length) filter.price = price;
    if (req.query.setCode) filter.setCode = String(req.query.setCode).slice(0, 80);
    if (req.query.double === "true") numberConditions.push({ number: { $regex: "(\\d)\\1" } });
    if (req.query.suffix) {
      const suffix = String(req.query.suffix).replace(/[^0-9]/g, "").slice(0, 3);
      if (suffix.length === 2 || suffix.length === 3) numberConditions.push({ number: { $regex: `${suffix}$` } });
    }
    if (numberConditions.length === 1) filter.number = numberConditions[0].number;
    else if (numberConditions.length > 1) filter.$and = numberConditions;
    const sortMap = { number_asc: { number: 1 }, number_desc: { number: -1 }, price_asc: { price: 1, number: 1 }, price_desc: { price: -1, number: 1 } };
    const sort = sortMap[req.query.sort] || sortMap.number_asc;
    const limit = Math.min(Number(req.query.limit) || 24, 500);
    const tickets = await Ticket.find(filter).populate("drawId", "label drawDate").sort(sort).limit(limit);
    res.json(tickets);
  } catch (error) { next(error); }
};

const createTicket = async (req, res, next) => {
  try {
    const { drawId, number, series = "", setCode = "", price = 80, faceValue = 80 } = req.body;
    if (!drawId || !/^\d{6}$/.test(String(number || ""))) return res.status(400).json({ message: "กรุณาระบุงวดและเลขสลาก 6 หลัก" });
    if (!Number.isFinite(Number(price)) || Number(price) < 80 || Number(price) > 120) return res.status(400).json({ message: "ราคาสลากต้องอยู่ระหว่าง 80-120 บาท" });
    const draw = await Draw.findById(drawId);
    if (!draw) return res.status(404).json({ message: "ไม่พบงวดสลาก" });
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
    if (updates.price !== undefined && (Number(updates.price) < 80 || Number(updates.price) > 120)) return res.status(400).json({ message: "ราคาสลากต้องอยู่ระหว่าง 80-120 บาท" });
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
    const { firstPrize, secondPrize, thirdPrize, fourthPrize, fifthPrize, lastTwoDigits, frontThreeDigits, lastThreeDigits } = req.body;
    if (!/^\d{6}$/.test(String(firstPrize || ""))) return res.status(400).json({ message: "รางวัลที่ 1 ต้องเป็นเลข 6 หลัก" });
    const lastTwo = Array.isArray(lastTwoDigits) ? lastTwoDigits : [lastTwoDigits];
    if (lastTwo.length !== REQUIRED_RESULT_COUNTS.lastTwoDigits || lastTwo.some((number) => !/^\d{2}$/.test(String(number)))) return res.status(400).json({ message: "เลขท้าย 2 ตัวต้องมี 1 หมายเลข" });
    const frontThree = Array.isArray(frontThreeDigits) ? frontThreeDigits : [frontThreeDigits];
    const lastThree = Array.isArray(lastThreeDigits) ? lastThreeDigits : [lastThreeDigits];
    if (frontThree.length !== REQUIRED_RESULT_COUNTS.frontThreeDigits || frontThree.some((number) => !/^\d{3}$/.test(String(number)))) return res.status(400).json({ message: "เลขหน้า 3 ตัวต้องมี 2 หมายเลข" });
    if (lastThree.length !== REQUIRED_RESULT_COUNTS.lastThreeDigits || lastThree.some((number) => !/^\d{3}$/.test(String(number)))) return res.status(400).json({ message: "เลขท้าย 3 ตัวต้องมี 2 หมายเลข" });
    const rankPrizes = { secondPrize: [secondPrize, 5], thirdPrize: [thirdPrize, 10], fourthPrize: [fourthPrize, 50], fifthPrize: [fifthPrize, 100] };
    const rankLabels = { secondPrize: "รางวัลที่ 2", thirdPrize: "รางวัลที่ 3", fourthPrize: "รางวัลที่ 4", fifthPrize: "รางวัลที่ 5" };
    const resultFields = { "results.firstPrize": firstPrize, "results.lastTwoDigits": lastTwo, "results.frontThreeDigits": frontThree, "results.lastThreeDigits": lastThree, status: "announced" };
    for (const [field, [value, count]] of Object.entries(rankPrizes)) {
      if (value === undefined) return res.status(400).json({ message: `กรุณาระบุ${rankLabels[field]} ให้ครบ ${count} หมายเลขก่อนประกาศผล` });
      const values = Array.isArray(value) ? value : [value];
      if (values.length !== count || values.some((number) => !/^\d{6}$/.test(String(number)))) return res.status(400).json({ message: `${rankLabels[field]} ต้องมีเลข 6 หลักครบ ${count} หมายเลข` });
      resultFields[`results.${field}`] = values;
    }
    resultFields.isDemo = false;
    const draw = await Draw.findByIdAndUpdate(req.params.id, { $set: resultFields }, { new: true, runValidators: true });
    if (!draw) return res.status(404).json({ message: "ไม่พบงวดสลาก" });
    res.json({ draw });
  } catch (error) { next(error); }
};

const getCart = async (req, res, next) => {
  try {
    await releaseExpiredReservations();
    const cart = await Cart.findOne({ ownerKey: req.params.ownerKey }).populate("items.drawId", "label");
    if (cart && cart.expiresAt <= new Date()) {
      await Cart.deleteOne({ _id: cart._id });
      return res.json({ ownerKey: req.params.ownerKey, items: [], expiresAt: null, expired: true });
    }
    res.json(cart || { ownerKey: req.params.ownerKey, items: [], expiresAt: null });
  } catch (error) { next(error); }
};

const addToCart = async (req, res, next) => {
  try {
    await releaseExpiredReservations();
    const { ownerKey, ticketId } = req.body;
    if (!ownerKey || !ticketId) return res.status(400).json({ message: "ownerKey and ticketId are required" });
    let cart = await Cart.findOne({ ownerKey });
    if (cart && cart.expiresAt <= new Date()) {
      await Ticket.updateMany({ status: "reserved", reservedBy: ownerKey }, { $set: { status: "available", reservedBy: null, reservedUntil: null } });
      await Cart.deleteOne({ _id: cart._id });
      cart = null;
    }
    const until = cart?.expiresAt || cartExpiry();
    const ticket = await Ticket.findOne({ _id: ticketId, status: "available" });
    if (!ticket) return res.status(409).json({ message: "สลากใบนี้ถูกเลือกไปแล้ว" });
    const currentDraw = await Draw.findOne({ _id: ticket.drawId, status: { $in: ["open", "upcoming"] } });
    if (!saleIsOpen(currentDraw)) return res.status(409).json({ message: "ปิดรับ รอเปิดงวดถัดไป" });
    const reservedTicket = await Ticket.findOneAndUpdate(
      { _id: ticketId, status: "available" },
      { $set: { status: "reserved", reservedBy: ownerKey, reservedUntil: until } },
      { new: true }
    );
    if (!reservedTicket) return res.status(409).json({ message: "สลากใบนี้ถูกเลือกไปแล้ว" });
    cart = await Cart.findOneAndUpdate(
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
    if (!ageAtLeast20(req.user.dateOfBirth)) return res.status(403).json({ message: "ต้องยืนยันอายุ 20 ปีขึ้นไปก่อนสั่งซื้อ" });
    const { ownerKey, paymentMethod = "promptpay" } = req.body;
    const allowedPaymentMethods = ["promptpay", "bank_transfer", "credit_card", "truemoney"];
    if (!allowedPaymentMethods.includes(paymentMethod)) return res.status(400).json({ message: "กรุณาเลือกช่องทางชำระเงินที่รองรับ" });
    const cart = await Cart.findOne({ ownerKey }).populate("items.drawId", "label status saleStartAt saleEndAt drawDate");
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: "ตะกร้าว่างเปล่า" });
    if (cart.expiresAt <= new Date()) return res.status(410).json({ message: "หมดเวลาจองสลากแล้ว" });
    if (!cart.items.every((item) => saleIsOpen(item.drawId))) return res.status(409).json({ message: "ปิดรับ รอเปิดงวดถัดไป" });
    const liveItems = await Ticket.find({ _id: { $in: cart.items.map((item) => item.ticketId) }, status: "reserved", reservedBy: ownerKey });
    if (liveItems.length !== cart.items.length) return res.status(409).json({ message: "สลากบางรายการหมดเวลาจองหรือถูกซื้อแล้ว กรุณาตรวจตะกร้าอีกครั้ง" });
    const subtotal = cart.items.reduce((sum, item) => sum + item.priceSnapshot, 0);
    const order = await Order.create({
      orderNo: `LT-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      userId: req.user._id,
      buyerName: req.user.name,
      buyerPhone: req.user.phone || req.user.email,
      items: cart.items.map((item) => ({ ticketId: item.ticketId, number: item.number, drawId: item.drawId?._id || item.drawId, drawLabel: item.drawId?.label, price: item.priceSnapshot })),
      subtotal,
      total: subtotal,
      paymentMethod,
      status: "paid",
      paymentStatus: "paid",
    });
    const sold = await Ticket.updateMany({ _id: { $in: cart.items.map((item) => item.ticketId) }, status: "reserved", reservedBy: ownerKey }, { $set: { status: "sold", soldOrderId: order._id } });
    if (sold.modifiedCount !== cart.items.length) {
      await Order.updateOne({ _id: order._id }, { $set: { status: "cancelled", paymentStatus: "failed" } });
      return res.status(409).json({ message: "สลากถูกซื้อหรือหมดเวลาจองแล้ว กรุณาตรวจตะกร้าอีกครั้ง" });
    }
    await Cart.deleteOne({ _id: cart._id });
    res.status(201).json(order);
  } catch (error) { next(error); }
};

module.exports = { getDraws, getCurrentDraw, getDashboard, getResults, getTickets, createTicket, listAdminTickets, updateTicket, deleteTicket, listOrders, approvePayment, publishResults, getCart, addToCart, removeFromCart, createOrder };
