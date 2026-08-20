import { Ticket } from "../../models/ticket.model.js";

export function normalizeAiResult({ result, provider, model }) {
  return {
    status: "completed",
    summary: stringValue(result.summary),
    problem: stringValue(result.problem),
    likelyRootCause: stringValue(result.likelyRootCause),
    developerBrief: stringValue(result.developerBrief),
    title: stringValue(result.title),
    ticketLabel: stringValue(result.ticketLabel),
    priorityLabel: stringValue(result.priorityLabel),
    sections: normalizeSections(result.sections, result),
    suspectedFiles: normalizeFiles(result.suspectedFiles),
    investigationSteps: normalizeStringArray(result.investigationSteps),
    suggestedFixes: normalizeStringArray(result.suggestedFixes),
    validationSteps: normalizeStringArray(result.validationSteps),
    confidence: clampConfidence(result.confidence),
    provider,
    model,
    error: "",
    analyzedAt: new Date(),
  };
}

export function skippedAiResult(message) {
  const provider = process.env.AI_PROVIDER_ORDER || process.env.AI_PROVIDER || "gemini,groq,cerebras";

  return {
    status: "skipped",
    summary: "AI analysis is not configured yet.",
    problem: "The ticket was saved and assigned normally, but AI could not run.",
    likelyRootCause: "",
    developerBrief: message,
    suspectedFiles: [],
    sections: [
      {
        title: "AI analysis skipped",
        body: message,
        items: [
          "Add at least one provider key to backend/.env.",
          "Restart the backend.",
          "Run AI analysis again from the ticket.",
        ],
        code: "",
        severity: "configuration",
      },
    ],
    investigationSteps: [
      "Add at least one provider key to backend/.env.",
      "Recommended: GEMINI_API_KEY first, then GROQ_API_KEY or CEREBRAS_API_KEY as fallbacks.",
      "Restart the backend.",
      "Run AI analysis again from the ticket.",
    ],
    suggestedFixes: [],
    validationSteps: [],
    confidence: 0,
    provider,
    model: "",
    error: message,
    analyzedAt: new Date(),
  };
}

export function failedAiResult(message) {
  const provider = process.env.AI_PROVIDER_ORDER || process.env.AI_PROVIDER || "gemini,groq,cerebras";

  return {
    status: "failed",
    summary: "AI analysis failed.",
    problem: "",
    likelyRootCause: "",
    developerBrief: "Retry AI analysis after checking backend logs and provider configuration.",
    suspectedFiles: [],
    sections: [
      {
        title: "AI analysis failed",
        body: message,
        items: ["Check backend logs and provider configuration.", "Run AI analysis again after fixing the provider error."],
        code: "",
        severity: "failed",
      },
    ],
    investigationSteps: [],
    suggestedFixes: [],
    validationSteps: [],
    confidence: 0,
    provider,
    model: "",
    error: message,
    analyzedAt: new Date(),
  };
}

export async function saveTicketAiAnalysis({ organizationId, ticketId, aiAnalysis }) {
  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, organizationId },
    {
      $set: { aiAnalysis },
      $push: {
        activity: {
          actorId: null,
          action: "internal_note_added",
          message: `AI analysis ${aiAnalysis.status}`,
        },
      },
    },
    { new: true }
  );

  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  return ticket;
}

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];

  return files
    .map((file) => ({
      path: stringValue(file.path),
      reason: stringValue(file.reason),
      lineStart: numberOrNull(file.lineStart),
      lineEnd: numberOrNull(file.lineEnd),
    }))
    .filter((file) => file.path || file.reason)
    .slice(0, 10);
}

function normalizeSections(sections, result) {
  if (Array.isArray(sections) && sections.length > 0) {
    return sections
      .map((section) => ({
        title: stringValue(section.title),
        body: stringValue(section.body),
        items: normalizeStringArray(section.items),
        code: stringValue(section.code),
        severity: stringValue(section.severity),
      }))
      .filter((section) => section.title || section.body || section.items.length || section.code)
      .slice(0, 12);
  }

  return legacySections(result);
}

function legacySections(result) {
  const candidates = [
    [result.problem, "Problem"],
    [result.likelyRootCause, "Likely root cause"],
    [result.developerBrief, "Developer brief"],
    [result.investigationSteps, "Investigation steps"],
    [result.suggestedFixes, "Suggested fixes"],
    [result.validationSteps, "Validation steps"],
  ];

  return candidates
    .map(([value, title]) => ({
      title,
      body: Array.isArray(value) ? "" : stringValue(value),
      items: Array.isArray(value) ? normalizeStringArray(value) : [],
      code: "",
      severity: "",
    }))
    .filter((section) => section.body || section.items.length);
}

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.map(stringValue).filter(Boolean).slice(0, 12) : [];
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}
