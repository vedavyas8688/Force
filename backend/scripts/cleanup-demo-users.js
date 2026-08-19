import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/user.model.js";

const keepEmails = new Set(
  (process.env.CLEANUP_KEEP_EMAILS || "admin@force.local,vedavyas742@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const demoEmailPatterns = [
  /@force\.local$/i,
  /^remove\d+@force\.local$/i,
];

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({}).select("_id name email role status").lean();
  const toRemove = users.filter((user) => {
    const email = user.email.toLowerCase();
    return !keepEmails.has(email) && demoEmailPatterns.some((pattern) => pattern.test(email));
  });

  if (toRemove.length === 0) {
    console.log("No demo users found to remove.");
    await mongoose.disconnect();
    return;
  }

  const result = await User.deleteMany({ _id: { $in: toRemove.map((user) => user._id) } });

  console.log(`Removed ${result.deletedCount} demo/test users:`);
  for (const user of toRemove) {
    console.log(`- ${user.name} <${user.email}> (${user.role}, ${user.status})`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
