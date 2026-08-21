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
      title: "Short, specific title for this analysis, not a restatement of the ticket title",
      ticketLabel: "Readable ticket number or short ID",
      priorityLabel: "Ticket priority label",
      summary: "1-2 sentences explaining what is broken and why. No padding.",
      sections: [
        {
          title: "A specific, meaningful heading you choose based on what this section actually says",
          body: "Only as many sentences as needed. One sentence is fine when that is enough.",
          items: ["Only use bullets for genuine lists, not for a single restated sentence"],
          code: "Only include an exact snippet or line reference from provided code context. Omit otherwise.",
          severity: "Optional",
        },
      ],
      suspectedFiles: [
        {
          path: "Exact file path that appears verbatim in the provided code context. Never invent a path.",
          reason: "Why this file matters, in one sentence.",
          lineStart: "Real line number from the provided context, or null",
          lineEnd: "Real line number from the provided context, or null",
        },
      ],
      investigationSteps: ["Only include steps that are genuinely necessary. Omit if the root cause is already certain from context."],
      suggestedFixes: ["Concrete fix ideas. Omit if a fix is already fully described in a section."],
      validationSteps: ["How to confirm the fix works. Keep short."],
      confidence: "Number from 0 to 1",
    },
    rules: [
      "Decide how many sections to use based on the actual complexity of this issue. A simple, obvious bug may only need 2-4 sections. A complex multi-file issue may need more. Never pad the output to hit a target count.",
      "Title each section based on what it actually contains. Do not use a fixed template of section names.",
      "Never say the same thing twice across two sections. If two points overlap, merge them into one section.",
      "Order sections so the most actionable, most certain information comes first. Put speculation or missing-context notes last.",
      "Every claim about a specific file or line number must come from the provided code context verbatim. If no code context is available, say so once, briefly.",
      "If the root cause is fully certain from the ticket description or code context, do not manufacture uncertainty or unnecessary investigation steps.",
      "Omit optional fields or arrays rather than filling them with placeholders, restatements, or N/A.",
      "Write for a developer who has 10 seconds to decide what to do next, then can read more if needed.",
      "Put every UI-facing heading inside sections[].title. Do not rely on frontend labels.",
      "Keep the output practical for a developer receiving an assigned ticket.",
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
