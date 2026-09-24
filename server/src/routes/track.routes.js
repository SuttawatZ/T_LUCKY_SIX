const express = require("express");
const multer = require("multer");
const {
    getTracks,
    createTrack,
    downloadTrack,
} = require("../controllers/track.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});
const requireFileAuth = (req, res, next) => req.file ? requireAuth(req, res, next) : next();
const requireFileRole = (req, res, next) => req.file ? requireRole("admin", "staff")(req, res, next) : next();

router.get("/", getTracks);
router.post("/", upload.single("file"), requireFileAuth, requireFileRole, createTrack);
router.post("/:id/download", downloadTrack);

module.exports = router;