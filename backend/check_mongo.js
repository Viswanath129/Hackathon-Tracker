const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 2000 });
        console.log("Connected to MongoDB");
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log("Collections:", collections.map(c => c.name));
        mongoose.disconnect();
    } catch (err) {
        console.error("MongoDB Connection Error:", err.message);
    }
}
run();
