import { getRedisConnection } from "../../config/redis.js";
import { AuditLog } from "../../models/audit-log.model.js";
import { CodeFile } from "../../models/code-file.model.js";
import { Commit } from "../../models/commit.model.js";
import { GitConnection } from "../../models/git-connection.model.js";
import { GitHubInstallation } from "../../models/github-installation.model.js";
import { GitHubOAuthState } from "../../models/github-oauth-state.model.js";
import { Notification } from "../../models/notification.model.js";
import { Organization } from "../../models/organization.model.js";
import { Project } from "../../models/project.model.js";
import { Ticket } from "../../models/ticket.model.js";
import { User } from "../../models/user.model.js";
import { hashRefreshToken } from "../auth/token.service.js";
import { sendInviteOtpEmail } from "../notifications/email.service.js";

const activeTicketStatuses = ["open", "triaged", "assigned", "in_progress"];
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

export async function getPlatformOverview() {
  const [organizations, users, projects, tickets] = await Promise.all([
    Organization.find({}).sort({ createdAt: -1 }).lean(),
    User.find({}).select("organizationId name email role status createdAt").lean(),
    Project.find({}).select("organizationId status repository.syncStatus").lean(),
    Ticket.find({}).select("organizationId status priority reopenRequests aiAnalysis createdAt updatedAt").lean(),
  ]);

  const queueHealth = await getQueueHealth();
  const usersByOrganization = groupByOrganization(users);
  const projectsByOrganization = groupByOrganization(projects);
  const ticketsByOrganization = groupByOrganization(tickets);

  return {
    summary: {
      organizations: organizations.length,
      activeOrganizations: organizations.filter((org) => org.status === "active").length,
      users: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      developers: users.filter((user) => user.role === "developer").length,
      customers: users.filter((user) => user.role === "customer").length,
      projects: projects.length,
      tickets: tickets.length,
      activeTickets: tickets.filter((ticket) => activeTicketStatuses.includes(ticket.status)).length,
    },
    usage: buildUsage({ tickets }),
    queueHealth,
    organizations: organizations.map((organization) => {
      const orgUsers = usersByOrganization.get(String(organization._id)) || [];
      const orgProjects = projectsByOrganization.get(String(organization._id)) || [];
      const orgTickets = ticketsByOrganization.get(String(organization._id)) || [];

      return {
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
          status: organization.status,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt,
        },
        counts: {
          users: orgUsers.length,
          admins: orgUsers.filter((user) => user.role === "admin").length,
          developers: orgUsers.filter((user) => user.role === "developer").length,
          customers: orgUsers.filter((user) => user.role === "customer").length,
          projects: orgProjects.length,
          tickets: orgTickets.length,
          activeTickets: orgTickets.filter((ticket) => activeTicketStatuses.includes(ticket.status)).length,
          reopenRequests: orgTickets.reduce(
            (total, ticket) =>
              total + (ticket.reopenRequests || []).filter((request) => request.status === "pending").length,
            0
          ),
          aiAnalyses: orgTickets.filter((ticket) => ticket.aiAnalysis?.status === "completed").length,
        },
        members: {
          admins: serializeMembers(orgUsers.filter((user) => user.role === "admin")),
        },
        lastActivity: latestDate([
          organization.updatedAt,
          ...orgTickets.map((ticket) => ticket.updatedAt),
        ]),
      };
    }),
  };
}

export async function createOrganizationAdmin({ organizationName, adminName, email }) {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) {
    const err = new Error("Email already in use");
    err.status = 409;
    throw err;
  }

  const organization = await Organization.create({
    name: organizationName.trim(),
    slug: `${slugify(organizationName)}-${Date.now().toString(36)}`,
    plan: "free",
  });

  const otp = createOtp();
  const ttlSeconds = Number(process.env.OTP_TTL_SECONDS || 300);
  const user = await User.create({
    organizationId: organization._id,
    name: adminName.trim(),
    email: normalizedEmail,
    passwordHash: await User.hashPassword(`invite-${Date.now()}-${Math.random()}`),
    role: "admin",
    status: "invited",
    inviteOtpHash: await hashRefreshToken(otp),
    inviteOtpExpiresAt: new Date(Date.now() + ttlSeconds * 1000),
  });

  await sendInviteOtpEmail({
    to: user.email,
    name: user.name,
    role: user.role,
    otp,
    acceptUrl: createAdminInviteAcceptUrl(user.email),
  });

  return {
    organization: serializeOrganization(organization),
    admin: serializeUser(user),
  };
}

export async function approveOrganization({ organizationId, actorId }) {
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    const err = new Error("Organization not found");
    err.status = 404;
    throw err;
  }

  if (organization.status !== "pending") {
    const err = new Error("Only pending organizations can be approved");
    err.status = 400;
    throw err;
  }

  const admin = await User.findOne({
    organizationId: organization._id,
    role: "admin",
  }).sort({ createdAt: 1 });

  if (!admin) {
    const err = new Error("No organization admin found for approval");
    err.status = 400;
    throw err;
  }

  const otp = createOtp();
  const ttlSeconds = Number(process.env.OTP_TTL_SECONDS || 300);

  organization.status = "active";
  await organization.save();

  admin.status = "invited";
  admin.inviteOtpHash = await hashRefreshToken(otp);
  admin.inviteOtpExpiresAt = new Date(Date.now() + ttlSeconds * 1000);
  admin.refreshTokenHash = undefined;
  admin.loginOtpHash = undefined;
  admin.loginOtpExpiresAt = undefined;
  await admin.save();

  await sendInviteOtpEmail({
    to: admin.email,
    name: admin.name,
    role: admin.role,
    otp,
    acceptUrl: createAdminInviteAcceptUrl(admin.email),
  });

  await AuditLog.create({
    organizationId: organization._id,
    actorId,
    actorRole: "super_admin",
    action: "organization_approved",
    targetType: "organization",
    targetId: String(organization._id),
    result: "success",
    metadata: {
      name: organization.name,
      slug: organization.slug,
      adminEmail: admin.email,
    },
  });

  return {
    organization: serializeOrganization(organization),
    admin: serializeUser(admin),
    message: "Organization approved and invite email sent",
  };
}

export async function deleteOrganization({ organizationId, actorId }) {
  const organization = await Organization.findById(organizationId).lean();
  if (!organization) {
    const err = new Error("Organization not found");
    err.status = 404;
    throw err;
  }

  const filter = { organizationId };
  const results = await Promise.all([
    User.deleteMany(filter),
    Project.deleteMany(filter),
    Ticket.deleteMany(filter),
    Notification.deleteMany(filter),
    GitHubInstallation.deleteMany(filter),
    GitConnection.deleteMany(filter),
    GitHubOAuthState.deleteMany(filter),
    Commit.deleteMany(filter),
    CodeFile.deleteMany(filter),
    AuditLog.deleteMany(filter),
  ]);

  await Organization.deleteOne({ _id: organizationId });

  await AuditLog.create({
    organizationId: null,
    actorId,
    actorRole: "super_admin",
    action: "organization_deleted",
    targetType: "organization",
    targetId: String(organizationId),
    result: "success",
    metadata: {
      name: organization.name,
      slug: organization.slug,
      deletedCounts: {
        users: results[0].deletedCount,
        projects: results[1].deletedCount,
        tickets: results[2].deletedCount,
        notifications: results[3].deletedCount,
        githubInstallations: results[4].deletedCount,
        gitConnections: results[5].deletedCount,
        githubOAuthStates: results[6].deletedCount,
        commits: results[7].deletedCount,
        codeFiles: results[8].deletedCount,
        auditLogs: results[9].deletedCount,
      },
    },
  });

  return {
    id: organization._id,
    name: organization.name,
    slug: organization.slug,
  };
}

async function getQueueHealth() {
  const connection = getRedisConnection();
  if (!connection) {
    return {
      redis: "not_configured",
      githubWorkerQueue: "inline_fallback",
    };
  }

  try {
    await connection.ping();
    return {
      redis: "ok",
      githubWorkerQueue: "configured",
    };
  } catch (err) {
    return {
      redis: "failed",
      githubWorkerQueue: "unavailable",
      error: err.message,
    };
  }
}

function groupByOrganization(items) {
  const map = new Map();

  for (const item of items) {
    const key = String(item.organizationId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }

  return map;
}

function latestDate(dates) {
  return dates
    .filter(Boolean)
    .map((date) => new Date(date))
    .sort((a, b) => b - a)[0] || null;
}

function buildUsage({ tickets }) {
  const since = Date.now() - sevenDaysMs;
  const aiTickets = tickets.filter((ticket) => ticket.aiAnalysis?.status && ticket.aiAnalysis.status !== "not_started");
  const completedAi = aiTickets.filter((ticket) => ticket.aiAnalysis.status === "completed");
  const providerCounts = {};

  for (const ticket of completedAi) {
    const provider = ticket.aiAnalysis?.provider || "unknown";
    providerCounts[provider] = (providerCounts[provider] || 0) + 1;
  }

  return {
    aiAnalysesTotal: aiTickets.length,
    aiAnalysesCompleted: completedAi.length,
    aiAnalysesFailed: aiTickets.filter((ticket) => ticket.aiAnalysis.status === "failed").length,
    aiAnalysesLast7Days: aiTickets.filter((ticket) => new Date(ticket.aiAnalysis.analyzedAt || ticket.updatedAt).getTime() >= since).length,
    ticketsCreatedLast7Days: tickets.filter((ticket) => new Date(ticket.createdAt).getTime() >= since).length,
    providerCounts,
    providerOrder: (process.env.AI_PROVIDER_ORDER || process.env.AI_PROVIDER || "gemini,groq,cerebras")
      .split(",")
      .map((provider) => provider.trim())
      .filter(Boolean),
    externalAiEnabled: process.env.AI_EXTERNAL_CALLS_ENABLED === "true",
  };
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createAdminInviteAcceptUrl(email) {
  const baseUrl = process.env.ADMIN_URL || "http://localhost:3002";
  const url = new URL("/accept-invite", baseUrl);
  url.searchParams.set("email", email);
  return url.toString();
}

function serializeOrganization(organization) {
  return {
    id: organization._id,
    name: organization.name,
    slug: organization.slug,
    plan: organization.plan,
    status: organization.status,
    createdAt: organization.createdAt,
  };
}

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    organizationId: user.organizationId,
  };
}

function serializeMembers(users) {
  return users
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    }));
}
