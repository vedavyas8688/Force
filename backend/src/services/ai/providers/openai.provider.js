export function getAiConfig() {
  return {
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 45000),
    externalCallsEnabled: process.env.AI_EXTERNAL_CALLS_ENABLED === "true",
  };
}

export function parseJsonResponse(content, provider = "AI provider") {
  if (!content) {
    throw new Error(`${provider} returned an empty response`);
  }

  const trimmed = String(content).trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch {
    const firstBrace = jsonText.indexOf("{");
    const lastBrace = jsonText.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(jsonText.slice(firstBrace, lastBrace + 1));
    }

    throw new Error(`${provider} did not return valid JSON`);
  }
}

export async function callOpenAiJson({ systemPrompt, userPrompt, imageAttachments = [] }) {
  const config = getAiConfig();

  if (!config.externalCallsEnabled) {
    const err = new Error("AI external calls are disabled. Set AI_EXTERNAL_CALLS_ENABLED=true after approving OpenAI analysis of ticket and repository context.");
    err.status = "skipped";
    throw err;
  }

  if (!config.apiKey) {
    const err = new Error("OPENAI_API_KEY is not configured");
    err.status = "skipped";
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: buildMessages({ systemPrompt, userPrompt, imageAttachments }),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data?.error?.message || "OpenAI request failed");
      err.statusCode = response.status;
      throw err;
    }

    return {
      provider: config.provider,
      model: config.model,
      data: parseJsonResponse(data?.choices?.[0]?.message?.content, "OpenAI"),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildMessages({ systemPrompt, userPrompt, imageAttachments }) {
  const images = (imageAttachments || [])
    .filter((attachment) => attachment.dataUrl)
    .map((attachment) => ({
      type: "image_url",
      image_url: {
        url: attachment.dataUrl,
        detail: "auto",
      },
    }));

  if (images.length === 0) {
    return [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];
  }

  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `${userPrompt}\n\nCustomer screenshots/images are attached below. Use them as evidence for the debugging summary.`,
        },
        ...images,
      ],
    },
  ];
}
