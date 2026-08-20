export function buildTicketAnalysisPrompt(context) {
  return {
    systemPrompt: [
      "You are FORCE's senior debugging assistant.",
      "Analyze support tickets for developers using only the provided tenant-scoped ticket, project, repository, commit, and code context.",
      "Do not invent files, line numbers, commits, or APIs that are not present in the context.",
      "If code context is missing or insufficient, say so clearly and provide the best investigation plan from the ticket details.",
      "The UI renders your sections exactly, so provide clear section titles and useful content yourself.",
      "Return only valid JSON.",
    ].join(" "),
    userPrompt: JSON.stringify(buildPromptPayload(context), null, 2),
  };
}

function buildPromptPayload({ ticket, project, repository, codeFiles, commits }) {
  return {
    task: "Produce a developer-useful ticket debugging analysis.",
    requiredJsonShape: {
      title: "AI debug analysis title",
      ticketLabel: "Readable ticket number or short ID",
      priorityLabel: "Ticket priority label",
      summary: "Short executive summary for admin and developer",
      sections: [
        {
          title: "Exact section title written by the AI, for example: 1. EXACT ERROR",
          body: "Main explanation text for this section",
          items: ["Optional bullet/checklist lines for this section"],
          code: "Optional exact code snippet or line references from provided code context only",
          severity: "Optional status/severity text",
        },
      ],
      suspectedFiles: [
        {
          path: "Exact file path from context",
          reason: "Why this file matters",
          lineStart: "First relevant line number or null",
          lineEnd: "Last relevant line number or null",
        },
      ],
      investigationSteps: ["Ordered debugging steps"],
      suggestedFixes: ["Concrete fix ideas"],
      validationSteps: ["How to confirm the fix works"],
      confidence: "Number from 0 to 1",
    },
    rules: [
      "Use exact file paths and line numbers only when code context supports them.",
      "Return 6 to 10 ordered sections matching a debugging handoff: exact error, what is wrong, root cause, exact code location, why it happens, developer action, related code, evidence, confidence, next action.",
      "Put every UI-facing heading inside sections[].title. Do not rely on frontend labels.",
      "Keep the output practical for a developer receiving an assigned ticket.",
      "Mention missing repository/code context if the repository has not been synced.",
      "Use customer screenshots or images as supporting evidence when present.",
    ],
    ticket: {
      id: ticket._id,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      customer: ticket.customerId?.email || ticket.customerId?.name || "",
      assignedTo: ticket.assignedTo?.email || "",
      comments: (ticket.comments || []).map((comment) => ({
        body: comment.body,
        createdAt: comment.createdAt,
      })),
      attachments: (ticket.attachments || []).map((attachment) => ({
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        description: attachment.description,
        isImage: String(attachment.type || "").startsWith("image/"),
        createdAt: attachment.createdAt,
      })),
    },
    project: {
      id: project?._id || ticket.projectId?._id || ticket.projectId,
      name: project?.name || ticket.projectId?.name || "",
      description: project?.description || "",
    },
    repository: {
      fullName: repository?.fullName || "",
      defaultBranch: repository?.defaultBranch || "",
      syncStatus: repository?.syncStatus || "not_connected",
      lastSyncedAt: repository?.lastSyncedAt || null,
    },
    recentCommits: (commits || []).map((commit) => ({
      sha: commit.sha,
      message: commit.message,
      author: commit.author,
      timestamp: commit.timestamp,
      filesChanged: commit.filesChanged,
    })),
    codeContext: (codeFiles || []).map((file) => ({
      path: file.path,
      language: file.language,
      contentWithLineNumbers: file.contentWithLineNumbers,
    })),
  };
}
