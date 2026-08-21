import mongoose from "mongoose";

let connectionPromise = null;
let listenersAttached = false;

export async function connectDatabase() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!listenersAttached) {
    mongoose.connection.on("connected", () => {
      console.log("[db] MongoDB connected");
    });

    mongoose.connection.on("error", (err) => {
      console.error("[db] MongoDB connection error:", err.message);
    });

    listenersAttached = true;
  }

  connectionPromise ||= mongoose.connect(uri).catch((err) => {
    connectionPromise = null;
    throw err;
  });
  await connectionPromise;
  return mongoose.connection;
}
