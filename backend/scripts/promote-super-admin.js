import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";

const email = process.argv[2]?.toLowerCase().trim();

if (!email) {
  console.error("Usage: npm run promote:super-admin -- admin@force.local");
  process.exit(1);
}

try {
  await connectDatabase();

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role: "super_admin", status: "active" } },
    { new: true }
  ).select("name email role status organizationId");

  if (!user) {
    console.error(`No user found for ${email}`);
    process.exitCode = 1;
  } else {
    console.log("Super admin ready");
    console.table([
      {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        organizationId: String(user.organizationId),
      },
    ]);
  }
} catch (err) {
  console.error("Promotion failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
