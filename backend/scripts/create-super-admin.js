import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import { Organization } from "../src/models/organization.model.js";
import { User } from "../src/models/user.model.js";

const email = process.argv[2]?.toLowerCase().trim() || "superadmin@force.local";
const password = process.argv[3] || process.env.SEED_PASSWORD || "Force@12345";

try {
  await connectDatabase();

  const organization = await Organization.findOneAndUpdate(
    { slug: "force-platform" },
    {
      name: "FORCE Platform",
      slug: "force-platform",
      plan: "enterprise",
      status: "active",
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const user = await User.findOneAndUpdate(
    { organizationId: organization._id, email },
    {
      $set: {
        organizationId: organization._id,
        name: "Super Admin",
        email,
        phone: "9000000000",
        role: "super_admin",
        status: "active",
        passwordHash: await User.hashPassword(password),
      },
      $unset: {
        refreshTokenHash: 1,
        loginOtpHash: 1,
        loginOtpExpiresAt: 1,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).select("name email role status organizationId");

  console.log("Super admin account ready");
  console.table([
    {
      email: user.email,
      role: user.role,
      password,
      organizationId: String(user.organizationId),
    },
  ]);
} catch (err) {
  console.error("Create super admin failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
