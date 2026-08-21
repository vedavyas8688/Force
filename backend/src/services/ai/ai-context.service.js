import { CodeFile } from "../../models/code-file.model.js";
import { Commit } from "../../models/commit.model.js";
import { Project } from "../../models/project.model.js";
import { Ticket } from "../../models/ticket.model.js";

const DEFAULT_MAX_FILES = 8;
const DEFAULT_MAX_CHARS = 30000;
const DEFAULT_MAX_CHARS_PER_FILE = 8000;
const SUPPORTED_TEXT_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".html",
  ".md",
  ".env.example",
];
const IGNORED_CODE_CONTEXT_PATTERNS = [
  /(^|\/)package-lock\.json$/i,
  /(^|\/)yarn\.lock$/i,
  /(^|\/)pnpm-lock\.yaml$/i,
  /(^|\/)node_modules\//i,
  /(^|\/)dist\//i,
  /(^|\/)build\//i,
];

export async function buildTicketAiContext({ organizationId, ticketId }) {
  const ticket = await Ticket.findOne({ _id: ticketId, organizationId })
    .populate([
      { path: "projectId", select: "name description repository" },
      { path: "customerId", select: "name email" },
      { path: "assignedTo", select: "name email role" },
    ])
    .lean();

  if (!ticket) {
    const err = new Error("Ticket not found");
    err.status = 404;
    throw err;
  }

  const project = await Project.findOne({ _id: ticket.projectId?._id || ticket.projectId, organizationId }).lean();
  const codeFiles = await selectRelevantCodeFiles({ organizationId, projectId: project?._id, ticket });
  const commits = project?._id
    ? await Commit.find({ organizationId, projectId: project._id })
        .sort({ timestamp: -1 })
        .limit(12)
        .select("sha message author timestamp filesChanged")
        .lean()
    : [];

  return {
    ticket,
    imageAttachments: selectImageAttachments(ticket),
    project,
    repository: project?.repository || {},
    codeFiles,
    commits,
  };
}

function selectImageAttachments(ticket) {
  return (ticket.attachments || [])
    .filter((attachment) => String(attachment.type || "").startsWith("image/") && attachment.dataUrl)
    .slice(0, 4)
    .map((attachment) => ({
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      dataUrl: attachment.dataUrl,
      description: attachment.description || "",
    }));
}

async function selectRelevantCodeFiles({ organizationId, projectId, ticket }) {
  if (!projectId) return [];

  const maxFiles = Number(process.env.AI_MAX_CONTEXT_FILES || DEFAULT_MAX_FILES);
  const maxChars = Number(process.env.AI_MAX_CONTEXT_CHARS || DEFAULT_MAX_CHARS);
  const maxCharsPerFile = Number(process.env.AI_MAX_CONTEXT_CHARS_PER_FILE || DEFAULT_MAX_CHARS_PER_FILE);
  const queryTerms = buildSearchTerms(ticket);

  const files = await CodeFile.find({ organizationId, projectId })
    .sort({ syncedAt: -1, updatedAt: -1 })
    .limit(200)
    .select("path language content size syncedAt")
    .lean();

  const rankedFiles = files
    .filter((file) => isSupportedTextFile(file.path) && !isIgnoredCodeContextFile(file.path))
    .map((file) => ({
      ...file,
      score: scoreFile(file, queryTerms),
    }))
    .sort((a, b) => b.score - a.score || String(a.path).localeCompare(String(b.path)));

  const selectedFiles = [];
  let usedChars = 0;

  for (const file of rankedFiles) {
    if (selectedFiles.length >= maxFiles || usedChars >= maxChars) break;

    const remainingChars = maxChars - usedChars;
    const content = String(file.content || "").slice(0, Math.min(remainingChars, maxCharsPerFile));
    if (!content.trim()) continue;

    usedChars += content.length;
    selectedFiles.push({
      path: file.path,
      language: file.language || languageFromPath(file.path),
      size: file.size || content.length,
      syncedAt: file.syncedAt,
      contentWithLineNumbers: addLineNumbers(content),
    });
  }

  return selectedFiles;
}

function buildSearchTerms(ticket) {
  return `${ticket.title || ""} ${ticket.description || ""}`
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((word) => word.length >= 3)
    .slice(0, 30);
}

function scoreFile(file, terms) {
  const haystack = `${file.path || ""}\n${file.content || ""}`.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function addLineNumbers(content) {
  return String(content || "")
    .split("\n")
    .map((line, index) => `${String(index + 1).padStart(4, " ")} | ${line}`)
    .join("\n");
}

function isSupportedTextFile(path = "") {
  return SUPPORTED_TEXT_EXTENSIONS.some((extension) => path.endsWith(extension));
}

function isIgnoredCodeContextFile(path = "") {
  const normalizedPath = String(path).replaceAll("\\", "/");
  return IGNORED_CODE_CONTEXT_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}

function languageFromPath(path = "") {
  const extension = path.split(".").pop();
  return extension || "";
}
