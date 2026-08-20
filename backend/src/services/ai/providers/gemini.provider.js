import { parseJsonResponse } from "./openai.provider.js";

export function getGeminiConfig() {
  return {
    provider: "gemini",
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 45000),
    externalCallsEnabled: process.env.AI_EXTERNAL_CALLS_ENABLED === "true",
  };
}

export async function callGeminiJson({ systemPrompt, userPrompt, imageAttachments = [] }) {
  const config = getGeminiConfig();

  if (!config.externalCallsEnabled) {
    const err = new Error("AI external calls are disabled. Set AI_EXTERNAL_CALLS_ENABLED=true after approving AI analysis of ticket and repository context.");
    err.status = "skipped";
    throw err;
  }

  if (!config.apiKey) {
    const err = new Error("GEMINI_API_KEY is not configured");
    err.status = "skipped";
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
          contents: [
            {
              role: "user",
              parts: buildGeminiParts({ userPrompt, imageAttachments }),
            },
          ],
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data?.error?.message || "Gemini request failed");
      err.statusCode = response.status;
      throw err;
    }

    return {
      provider: config.provider,
      model: config.model,
      data: parseJsonResponse(data?.candidates?.[0]?.content?.parts?.[0]?.text, "Gemini"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildGeminiParts({ userPrompt, imageAttachments }) {
  const parts = [
    {
      text: `${userPrompt}\n\nReturn only JSON. If customer screenshots/images are attached, use them as evidence for the debugging summary.`,
    },
  ];

  for (const attachment of imageAttachments || []) {
    const parsed = parseDataUrl(attachment.dataUrl);
    if (!parsed) continue;

    parts.push({
      inlineData: {
        mimeType: parsed.mimeType,
        data: parsed.data,
      },
    });
  }

  return parts;
}

function parseDataUrl(dataUrl = "") {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}
