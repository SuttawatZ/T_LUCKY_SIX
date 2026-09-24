const express = require("express");
const multer = require("multer");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { uploadFile } = require("../controllers/upload.controller");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
});

router.post(
    "/",
    requireAuth,
    requireRole("admin", "staff"),
    upload.single("file"),
    uploadFile
);

module.exports = router;
