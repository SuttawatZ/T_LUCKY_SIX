const mongoose = require("mongoose");
let connectionPromise;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.MONGO_URI).then(() => {
            console.log("MongoDB connected");
            return mongoose.connection;
        }).catch((error) => {
            connectionPromise = null;
            throw error;
        });
    }
    return connectionPromise;
};
module.exports = connectDB;