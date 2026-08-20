import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";

const email = process.argv[2]?.toLowerCase().trim();
const role = process.argv[3]?.trim();
const allowedRoles = new Set(["super_admin", "admin", "developer", "customer"]);

if (!email || !allowedRoles.has(role)) {
  console.error("Usage: npm run set:user-role -- user@example.com super_admin|admin|developer|customer");
  process.exit(1);
}

try {
  await connectDatabase();

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role, status: "active" } },
    { new: true }
  ).select("name email role status organizationId");

  if (!user) {
    console.error(`No user found for ${email}`);
    process.exitCode = 1;
  } else {
    console.log("User role updated");
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
  console.error("Role update failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
