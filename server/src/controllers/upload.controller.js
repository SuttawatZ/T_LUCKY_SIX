const { put } = require("@vercel/blob");

const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ message: "กรุณาเลือกไฟล์" });

        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        const blob = await put(`uploads/${Date.now()}-${safeName}`, req.file.buffer, {
            access: "public",
            addRandomSuffix: true,
            contentType: req.file.mimetype || "application/octet-stream",
        });

        res.status(201).json({
            url: blob.url,
            pathname: blob.pathname,
            fileName: req.file.originalname,
            contentType: req.file.mimetype || "application/octet-stream",
            size: req.file.size,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { uploadFile };
