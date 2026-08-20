import { getRedisConnection } from "../../config/redis.js";
import { GitHubInstallation } from "../../models/github-installation.model.js";
import { Organization } from "../../models/organization.model.js";
import { Project } from "../../models/project.model.js";
import { Ticket } from "../../models/ticket.model.js";
import { User } from "../../models/user.model.js";

const activeTicketStatuses = ["open", "triaged", "assigned", "in_progress", "pending_customer"];

export async function getPlatformOverview() {
  const [organizations, users, projects, tickets, gitInstallations] = await Promise.all([
    Organization.find({}).sort({ createdAt: -1 }).lean(),
    User.find({}).select("organizationId role status").lean(),
    Project.find({}).select("organizationId status repository.syncStatus").lean(),
    Ticket.find({}).select("organizationId status priority reopenRequests updatedAt").lean(),
    GitHubInstallation.find({}).select("organizationId status githubAccountLogin updatedAt").lean(),
  ]);

  const queueHealth = await getQueueHealth();
  const usersByOrganization = groupByOrganization(users);
  const projectsByOrganization = groupByOrganization(projects);
  const ticketsByOrganization = groupByOrganization(tickets);
  const gitByOrganization = groupByOrganization(gitInstallations);

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
      gitInstallations: gitInstallations.filter((installation) => installation.status === "active").length,
    },
    queueHealth,
    organizations: organizations.map((organization) => {
      const orgUsers = usersByOrganization.get(String(organization._id)) || [];
      const orgProjects = projectsByOrganization.get(String(organization._id)) || [];
      const orgTickets = ticketsByOrganization.get(String(organization._id)) || [];
      const orgGit = gitByOrganization.get(String(organization._id)) || [];

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
          gitInstallations: orgGit.filter((installation) => installation.status === "active").length,
        },
        lastActivity: latestDate([
          organization.updatedAt,
          ...orgTickets.map((ticket) => ticket.updatedAt),
          ...orgGit.map((installation) => installation.updatedAt),
        ]),
      };
    }),
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
