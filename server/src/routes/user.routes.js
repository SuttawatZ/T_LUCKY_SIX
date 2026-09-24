const express = require("express");
const { register, login, getMe, updateMe, addAddress, deleteAddress, listUsers, updateUserByAdmin } = require("../controllers/user.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateMe);
router.post("/me/addresses", requireAuth, addAddress);
router.delete("/me/addresses/:index", requireAuth, deleteAddress);
router.get("/admin/users", requireAuth, requireRole("admin"), listUsers);
router.patch("/admin/users/:id", requireAuth, requireRole("admin"), updateUserByAdmin);

module.exports = router;
