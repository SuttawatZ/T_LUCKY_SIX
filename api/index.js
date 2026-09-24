const app = require("../server/src/app");
const connectDB = require("../server/src/config/db");

module.exports = async (req, res) => {
    try {
        await connectDB();
        return app(req, res);
    } catch (error) {
        console.error("Vercel API request failed:", error);
        return res.status(500).json({ message: "Database connection failed" });
    }
};
