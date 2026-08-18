import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../backend/src/config/database.js";
import { Organization } from "../backend/src/models/organization.model.js";
import { User } from "../backend/src/models/user.model.js";

const seedOrganization = {
  name: "Force Demo",
  slug: "force-demo",
  plan: "starter",
  status: "active",
};

const seedUsers = [
  {
    name: "Admin User",
    email: "admin@force.local",
    phone: "9000000001",
    role: "admin",
  },
  {
    name: "Developer One",
    email: "developer1@force.local",
    phone: "9000000002",
    role: "developer",
  },
  {
    name: "Developer Two",
    email: "developer2@force.local",
    phone: "9000000003",
    role: "developer",
  },
  {
    name: "Customer One",
    email: "customer1@force.local",
    phone: "9000000004",
    role: "customer",
  },
  {
    name: "Customer Two",
    email: "customer2@force.local",
    phone: "9000000005",
    role: "customer",
  },
];

const password = process.env.SEED_PASSWORD || "Force@12345";

async function seed() {
  await connectDatabase();

  const organization = await Organization.findOneAndUpdate(
    { slug: seedOrganization.slug },
    seedOrganization,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const passwordHash = await User.hashPassword(password);

  for (const user of seedUsers) {
    await User.findOneAndUpdate(
      { organizationId: organization._id, email: user.email },
      {
        $set: {
          ...user,
          organizationId: organization._id,
          passwordHash,
          status: "active",
        },
        $unset: { refreshTokenHash: 1 },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  console.log("Seed data ready");
  console.table(
    seedUsers.map((user) => ({
      email: user.email,
      role: user.role,
      password,
    }))
  );
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

