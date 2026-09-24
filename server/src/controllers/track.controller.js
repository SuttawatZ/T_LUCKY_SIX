const Track = require("../models/track.model");
const { put } = require("@vercel/blob");

const uploadToBlob = async (file) => {
    if (!file) return null;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`uploads/${Date.now()}-${safeName}`, file.buffer, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.mimetype || "application/octet-stream",
    });
    return {
        fileUrl: blob.url,
        filePath: blob.pathname,
        fileName: file.originalname,
        fileType: file.mimetype || "application/octet-stream",
    };
};
const getTracks = async (req, res, next) => {
    try {
        const tracks = await Track.find();
        res.json(tracks);
    } catch (error) {
        next(error);
    }
};
const createTrack = async (req, res, next) => {
    try {
        const blobData = await uploadToBlob(req.file);
        const track = await Track.create({ ...req.body, ...(blobData || {}) });
        res.status(201).json(track);
    } catch (error) {
        next(error);
    }
};
const downloadTrack = async (req, res, next) => {
    try {
        const track = await Track.findByIdAndUpdate(
            req.params.id,
            { $inc: { downloads: 1 } },
            { new: true }
        );
        if (!track) {
            return res.status(404).json({ message: "Track not found" });
        }
        res.json({ title: track.title, downloads: track.downloads });
    } catch (error) {
        next(error);
    }
};

module.exports = { getTracks, createTrack, downloadTrack };