const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { getJwtSecret } = require("../config/auth");

const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ message: "กรุณาเข้าสู่ระบบ" });
    const payload = jwt.verify(token, getJwtSecret());
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "ไม่พบบัญชีผู้ใช้" });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") return res.status(401).json({ message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    next(error);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
  next();
};

module.exports = { requireAuth, requireRole };
