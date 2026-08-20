import { callGeminiJson } from "./providers/gemini.provider.js";
import { callOpenAiJson } from "./providers/openai.provider.js";
import { callOpenAiCompatibleJson } from "./providers/openai-compatible.provider.js";

const providerCallers = {
  gemini: (payload) => callGeminiJson(payload),
  groq: (payload) => callOpenAiCompatibleJson({ provider: "groq", ...payload }),
  cerebras: (payload) => callOpenAiCompatibleJson({ provider: "cerebras", ...payload }),
  openai: (payload) => callOpenAiJson(payload),
};

export async function callAiJsonWithFallback(payload) {
  const providers = getProviderOrder();
  const failures = [];

  for (const provider of providers) {
    const caller = providerCallers[provider];
    if (!caller) continue;

    try {
      return await caller(payload);
    } catch (err) {
      failures.push({
        provider,
        message: err.message,
        status: err.status,
        statusCode: err.statusCode,
      });

      if (err.status === "skipped") continue;
    }
  }

  const skipped = failures.every((failure) => failure.status === "skipped");
  const err = new Error(formatAiFailures(failures));
  if (skipped) err.status = "skipped";
  err.failures = failures;
  throw err;
}

export function getProviderOrder() {
  const configuredOrder = (process.env.AI_PROVIDER_ORDER || process.env.AI_PROVIDER || "gemini,groq,cerebras")
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(configuredOrder));
}

function formatAiFailures(failures) {
  if (failures.length === 0) return "No AI providers are configured.";

  return failures
    .map((failure) => `${failure.provider}: ${failure.message}`)
    .join(" | ");
}
