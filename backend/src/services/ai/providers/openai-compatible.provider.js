import { parseJsonResponse } from "./openai.provider.js";

const providerConfigs = {
  groq: {
    apiKeyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "openai/gpt-oss-120b",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
  cerebras: {
    apiKeyEnv: "CEREBRAS_API_KEY",
    modelEnv: "CEREBRAS_MODEL",
    defaultModel: "gpt-oss-120b",
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
  },
};

export async function callOpenAiCompatibleJson({ provider, systemPrompt, userPrompt }) {
  const config = getCompatibleConfig(provider);

  if (!config.externalCallsEnabled) {
    const err = new Error("AI external calls are disabled. Set AI_EXTERNAL_CALLS_ENABLED=true after approving AI analysis of ticket and repository context.");
    err.status = "skipped";
    throw err;
  }

  if (!config.apiKey) {
    const err = new Error(`${config.apiKeyEnv} is not configured`);
    err.status = "skipped";
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${userPrompt}\n\nReturn only valid JSON.` },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data?.error?.message || `${provider} request failed`);
      err.statusCode = response.status;
      throw err;
    }

    return {
      provider,
      model: config.model,
      data: parseJsonResponse(data?.choices?.[0]?.message?.content, provider),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function getCompatibleConfig(provider) {
  const config = providerConfigs[provider];
  if (!config) throw new Error(`Unsupported OpenAI-compatible provider: ${provider}`);

  return {
    ...config,
    provider,
    apiKey: process.env[config.apiKeyEnv] || "",
    model: process.env[config.modelEnv] || config.defaultModel,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 45000),
    externalCallsEnabled: process.env.AI_EXTERNAL_CALLS_ENABLED === "true",
  };
}
