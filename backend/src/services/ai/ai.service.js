import { buildTicketAiContext } from "./ai-context.service.js";
import { buildTicketAnalysisPrompt } from "./ai-prompt.service.js";
import { callAiJsonWithFallback } from "./ai-provider-manager.service.js";
import { failedAiResult, normalizeAiResult, saveTicketAiAnalysis, skippedAiResult } from "./ai-result.service.js";

export async function analyzeTicket({ organizationId, ticketId }) {
  const context = await buildTicketAiContext({ organizationId, ticketId });
  const { systemPrompt, userPrompt } = buildTicketAnalysisPrompt(context);

  try {
    const response = await callAiJsonWithFallback({
      systemPrompt,
      userPrompt,
      imageAttachments: context.imageAttachments,
    });
    const aiAnalysis = normalizeAiResult({
      result: response.data,
      provider: response.provider,
      model: response.model,
    });

    await saveTicketAiAnalysis({ organizationId, ticketId, aiAnalysis });
    return aiAnalysis;
  } catch (err) {
    const aiAnalysis = err.status === "skipped"
      ? skippedAiResult(err.message)
      : failedAiResult(err.message);

    await saveTicketAiAnalysis({ organizationId, ticketId, aiAnalysis });
    return aiAnalysis;
  }
}

export async function analyzeTicketSafely({ organizationId, ticketId }) {
  try {
    return await analyzeTicket({ organizationId, ticketId });
  } catch {
    return null;
  }
}
