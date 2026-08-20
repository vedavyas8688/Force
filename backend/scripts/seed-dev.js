import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database.js";
import { AuditLog } from "../src/models/audit-log.model.js";
import { CodeFile } from "../src/models/code-file.model.js";
import { Commit } from "../src/models/commit.model.js";
import { GitConnection } from "../src/models/git-connection.model.js";
import { GitHubInstallation } from "../src/models/github-installation.model.js";
import { GitHubOAuthState } from "../src/models/github-oauth-state.model.js";
import { Organization } from "../src/models/organization.model.js";
import { Project } from "../src/models/project.model.js";
import { Ticket } from "../src/models/ticket.model.js";
import { User } from "../src/models/user.model.js";

const password = process.env.SEED_PASSWORD || "Force@12345";
const shouldReset = process.env.SEED_RESET === "true";

const platformOrganization = {
  name: "FORCE Platform",
  slug: "force-platform",
  plan: "enterprise",
  status: "active",
};

const superAdmin = {
  name: "Super Admin",
  email: "superadmin@force.local",
  phone: "9000000000",
  role: "super_admin",
};

const organizations = [
  {
    name: "Force Demo",
    slug: "force-demo",
    plan: "starter",
    status: "active",
    assignmentSettings: { defaultStrategy: "round_robin" },
  },
  {
    name: "Infowell Systems",
    slug: "infowell-systems",
    plan: "business",
    status: "active",
    assignmentSettings: { defaultStrategy: "first_available" },
  },
];

const organizationUsers = {
  "force-demo": [
    { name: "Force Admin", email: "admin@force.local", phone: "9000000001", role: "admin" },
    { name: "Developer One", email: "developer1@force.local", phone: "9000000002", role: "developer" },
    { name: "Developer Two", email: "developer2@force.local", phone: "9000000003", role: "developer" },
    { name: "Customer One", email: "customer1@force.local", phone: "9000000004", role: "customer" },
    { name: "Customer Two", email: "customer2@force.local", phone: "9000000005", role: "customer" },
  ],
  "infowell-systems": [
    { name: "Infowell Admin", email: "admin2@force.local", phone: "9000000011", role: "admin" },
    { name: "Infowell Developer", email: "developer3@force.local", phone: "9000000012", role: "developer" },
    { name: "Infowell Customer One", email: "customer3@force.local", phone: "9000000013", role: "customer" },
    { name: "Infowell Customer Two", email: "customer4@force.local", phone: "9000000014", role: "customer" },
  ],
};

const organizationProjects = {
  "force-demo": [
    { name: "Customer Portal", description: "Customer-facing ticket portal", status: "active" },
    { name: "Admin Portal", description: "Organization admin workspace", status: "active" },
  ],
  "infowell-systems": [
    { name: "Support Desk", description: "Infowell support workflow", status: "active" },
  ],
};

try {
  await connectDatabase();

  if (shouldReset) {
    await resetSeedData();
  }

  const passwordHash = await User.hashPassword(password);
  const platformOrg = await upsertOrganization(platformOrganization);
  await upsertUser(platformOrg._id, superAdmin, passwordHash);

  const createdUsers = [superAdmin];
  const createdOrganizations = [];

  for (const organizationSeed of organizations) {
    const organization = await upsertOrganization(organizationSeed);
    createdOrganizations.push(organization);

    for (const user of organizationUsers[organizationSeed.slug]) {
      await upsertUser(organization._id, user, passwordHash);
      createdUsers.push(user);
    }

    for (const project of organizationProjects[organizationSeed.slug]) {
      await Project.findOneAndUpdate(
        { organizationId: organization._id, name: project.name },
        {
          $set: {
            ...project,
            organizationId: organization._id,
            repository: {
              provider: "github",
              fullName: "",
              owner: "",
              name: "",
              defaultBranch: "main",
              installationId: null,
              gitConnectionId: null,
              lastCommitSha: "",
              lastSyncedAt: null,
              syncStatus: "not_connected",
              syncError: "",
            },
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }
  }

  console.log(shouldReset ? "Clean seed data ready" : "Seed data ready");
  console.table(
    createdUsers.map((user) => ({
      email: user.email,
      role: user.role,
      password,
    }))
  );
  console.table(
    createdOrganizations.map((organization) => ({
      organization: organization.name,
      admins: organizationUsers[organization.slug].filter((user) => user.role === "admin").length,
      developers: organizationUsers[organization.slug].filter((user) => user.role === "developer").length,
      customers: organizationUsers[organization.slug].filter((user) => user.role === "customer").length,
      projects: organizationProjects[organization.slug].length,
    }))
  );
} catch (err) {
  console.error("Seed failed:", err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}

async function resetSeedData() {
  await Promise.all([
    AuditLog.deleteMany({}),
    CodeFile.deleteMany({}),
    Commit.deleteMany({}),
    GitConnection.deleteMany({}),
    GitHubInstallation.deleteMany({}),
    GitHubOAuthState.deleteMany({}),
    Ticket.deleteMany({}),
    Project.deleteMany({}),
    User.deleteMany({}),
    Organization.deleteMany({}),
  ]);
}

async function upsertOrganization(organization) {
  return Organization.findOneAndUpdate(
    { slug: organization.slug },
    organization,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function upsertUser(organizationId, user, passwordHash) {
  return User.findOneAndUpdate(
    { organizationId, email: user.email },
    {
      $set: {
        ...user,
        organizationId,
        passwordHash,
        status: "active",
      },
      $unset: {
        refreshTokenHash: 1,
        loginOtpHash: 1,
        loginOtpExpiresAt: 1,
        inviteOtpHash: 1,
        inviteOtpExpiresAt: 1,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}
