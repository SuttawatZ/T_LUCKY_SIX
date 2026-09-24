const express = require("express");
const cors = require("cors");
const path = require("path");
const trackRoutes = require("./routes/track.routes");
const lotteryRoutes = require("./routes/lottery.routes");
const userRoutes = require("./routes/user.routes");
const uploadRoutes = require("./routes/upload.routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");
const app = express();

// 1. Global middleware
app.use(cors());
app.use(express.json());

// 2. Routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/tracks", trackRoutes);
app.use("/api/lottery", lotteryRoutes);
app.use("/api/users", userRoutes);
app.use("/api/uploads", uploadRoutes);
app.use(express.static(path.join(__dirname, "../../client/dist")));

// 3. Error handling — must be LAST
app.use(notFound);
app.use(errorHandler);

module.exports = app;
