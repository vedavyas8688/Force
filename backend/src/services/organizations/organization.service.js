import { Organization } from "../../models/organization.model.js";

export async function getOrganizationSettings({ organizationId }) {
  const organization = await Organization.findById(organizationId).lean();

  if (!organization) {
    const err = new Error("Organization not found");
    err.status = 404;
    throw err;
  }

  return {
    organization: {
      id: organization._id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      status: organization.status,
    },
    assignmentSettings: {
      defaultStrategy:
        organization.assignmentSettings?.defaultStrategy || "round_robin",
    },
  };
}

export async function updateAssignmentSettings({ organizationId, defaultStrategy }) {
  const allowedStrategies = ["manual", "round_robin", "least_load", "random", "first_available"];

  if (!allowedStrategies.includes(defaultStrategy)) {
    const err = new Error("Invalid assignment strategy");
    err.status = 400;
    throw err;
  }

  const organization = await Organization.findByIdAndUpdate(
    organizationId,
    { $set: { "assignmentSettings.defaultStrategy": defaultStrategy } },
    { new: true }
  ).lean();

  if (!organization) {
    const err = new Error("Organization not found");
    err.status = 404;
    throw err;
  }

  return {
    defaultStrategy: organization.assignmentSettings.defaultStrategy,
  };
}
