// AIService — única camada que fala com o provedor de IA.
// A chave nunca sai do servidor.

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

const MODEL_MAP: Record<string, string> = {
  "traz-fast": "gemini-3.6-flash",
  "traz-pro": "gemini-3.6-flash",
  "traz-reasoning": "gemini-3.6-flash",
  "traz-code": "gemini-3.6-flash",
};

export type AIMessage = { role: "user" | "assistant" | "system"; content: string };

export class AIServiceError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function resolveModel(model: string) {
  return process.env["GEMINI_MODEL"] || MODEL_MAP[model] || "gemini-3.6-flash";
}

function apiKey() {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) {
    throw new AIServiceError("A chave da IA não está configurada no servidor.", 503);
  }
  return key;
}

export type InlineAttachment = { mimeType: string; data: string };

async function callGemini(opts: {
  model: string;
  system: string;
  messages: AIMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  attachments?: InlineAttachment[];
  thinkingLevel?: "low" | "high";
}) {
  const key = apiKey();
  const modelId = resolveModel(opts.model);

  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

  const contents: { role: string; parts: Part[] }[] = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }] as Part[],
    }));

  // anexos entram junto da última mensagem do usuário
  if (opts.attachments?.length) {
    const last = contents[contents.length - 1];
    const target =
      last && last.role === "user"
        ? last
        : (contents.push({ role: "user", parts: [{ text: "Arquivos em anexo." }] }),
          contents[contents.length - 1]!);
    for (const attachment of opts.attachments) {
      target.parts.push({
        inlineData: { mimeType: attachment.mimeType, data: attachment.data },
      });
    }
  }

  const body = JSON.stringify({
    contents,
    systemInstruction: { parts: [{ text: opts.system }] },
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      // O modelo "pensa" antes de responder e esse raciocínio também consome tokens.
      // Com um limite baixo a resposta chegava cortada (ou vazia) a partir da 2ª mensagem.
      maxOutputTokens: opts.maxOutputTokens ?? 32768,
      ...(opts.thinkingLevel ? { thinkingConfig: { thinkingLevel: opts.thinkingLevel } } : {}),
    },
  });

  // O Gemini devolve 429/503 quando está sobrecarregado: tentamos de novo com espera crescente.
  const MAX_ATTEMPTS = 5;
  let res: Response | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      res = await fetch(`${GEMINI_ENDPOINT}/${modelId}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
      });
    } catch {
      if (attempt === MAX_ATTEMPTS) {
        throw new AIServiceError("Não foi possível falar com a IA agora. Tente de novo.", 502);
      }
      await new Promise((r) => setTimeout(r, 700 * attempt));
      continue;
    }

    if (res.ok) break;

    const errorBody = await res.text();
    console.error(`[AIService] falha ${res.status} (tentativa ${attempt}): ${errorBody.slice(0, 300)}`);

    if (res.status === 401 || res.status === 403) {
      throw new AIServiceError("A chave da IA foi recusada. Verifique a chave configurada.", 403);
    }
    if (res.status === 404) {
      throw new AIServiceError("O modelo de IA configurado não está disponível para esta chave.", 404);
    }

    // O Google diz quanto tempo falta ("Please retry in 31.2s"); respeitamos esse tempo.
    const suggested = /retry in ([\d.]+)s/i.exec(errorBody);
    const waitMs = suggested ? Math.ceil(Number(suggested[1]) * 1000) : 0;

    const retryable = res.status === 429 || res.status >= 500;
    // Só vale esperar automaticamente se a espera for curta.
    const canWait = retryable && attempt < MAX_ATTEMPTS && waitMs <= 20_000;
    if (!canWait) {
      if (res.status === 429) {
        const seconds = waitMs ? Math.ceil(waitMs / 1000) : 0;
        throw new AIServiceError(
          seconds
            ? `A chave do Gemini atingiu o limite de pedidos por minuto do plano gratuito. Tente de novo em cerca de ${seconds} segundos.`
            : "A chave do Gemini atingiu o limite de uso do plano gratuito. Tente de novo em instantes ou ative o faturamento na sua conta Google AI.",
          429,
        );
      }
      if (res.status === 503) {
        throw new AIServiceError(
          "A IA está sobrecarregada no momento. Tente novamente em alguns segundos.",
          503,
        );
      }
      throw new AIServiceError("A IA não conseguiu responder agora.", 502);
    }

    await new Promise((r) => setTimeout(r, Math.max(waitMs, 700 * attempt * attempt)));
  }

  if (!res || !res.ok) {
    throw new AIServiceError("A IA não conseguiu responder agora.", 502);
  }

  const json = (await res.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  };
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new AIServiceError(
        "A resposta ficou grande demais. Peça a correção de um arquivo por vez.",
        502,
      );
    }
    if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "PROHIBITED_CONTENT") {
      throw new AIServiceError("A IA recusou responder a este pedido.", 403);
    }
    throw new AIServiceError("A IA devolveu uma resposta vazia. Tente reenviar a mensagem.", 502);
  }
  return text.trim();
}

/**
 * Conversas com muito código estouravam o limite do modelo já na segunda
 * mensagem. Guardamos as últimas mensagens inteiras e resumimos as antigas.
 */
function trimHistory(history: AIMessage[]): AIMessage[] {
  const KEEP_FULL = 6;
  const OLD_LIMIT = 1500;
  const recent = history.slice(-KEEP_FULL);
  const older = history.slice(0, Math.max(0, history.length - KEEP_FULL)).slice(-10);

  const shorten = (m: AIMessage): AIMessage =>
    m.content.length > OLD_LIMIT
      ? { ...m, content: `${m.content.slice(0, OLD_LIMIT)}\n\n[...trecho antigo omitido...]` }
      : m;

  return [...older.map(shorten), ...recent];
}

export const AIService = {
  async reply(opts: {
    model: string;
    language: string;
    history: AIMessage[];
    memories?: { key: string; value: string }[];
    attachments?: InlineAttachment[];
    fast?: boolean;
  }) {
    const memoryBlock =
      opts.memories && opts.memories.length
        ? `\n\nMemórias do usuário:\n${opts.memories.map((m) => `- ${m.key}: ${m.value}`).join("\n")}`
        : "";

    const isRoblox = /^lua(u)?$/i.test(opts.language);

    const system = [
      "Você é a Traz AI, uma assistente especialista em programação.",
      `A linguagem foco desta conversa é ${opts.language}, mas você pode falar de qualquer assunto de programação.`,
      "Responda em português do Brasil, de forma direta e prática.",
      "Use blocos de código markdown com a linguagem indicada sempre que mostrar código.",
      "Explique o raciocínio de forma curta antes ou depois do código.",
      "REGRA DE ARQUIVOS: sempre que o código pertencer a um arquivo de um projeto, abra o bloco com a linguagem e o caminho completo, assim: ```ts path=src/lib/utils.ts. Um bloco por arquivo, com o conteúdo completo do arquivo. Blocos de exemplo solto, comandos de terminal ou trechos curtos ficam sem path.",
      isRoblox
        ? "Para Roblox/Luau, o caminho deve seguir a árvore do Roblox Studio, começando por um serviço (Workspace, ReplicatedStorage, ServerScriptService, ServerStorage, StarterGui, StarterPlayer/StarterPlayerScripts, ReplicatedFirst). Use .server.lua para Scripts, .client.lua para LocalScripts e .lua para ModuleScripts. Exemplo: ```lua path=ServerScriptService/Inventario/Inventario.server.lua"
        : "Para projetos de site ou sistema, use caminhos reais de pasta (ex.: src/components/Header.tsx, backend/src/routes/users.ts).",
      memoryBlock,
    ].join(" ");

    return callGemini({
      model: opts.model,
      system,
      messages: trimHistory(opts.history),
      ...(opts.fast ? { thinkingLevel: "low" as const } : {}),
      ...(opts.attachments?.length ? { attachments: opts.attachments } : {}),
    });
  },

  async generateTitle(firstMessage: string, language: string) {
    try {
      const text = await callGemini({
        model: "traz-fast",
        system:
          "Você cria títulos curtos para conversas de programação. Responda APENAS com o título, " +
          "em português, no máximo 4 palavras, sem aspas e sem pontuação final.",
        messages: [{ role: "user", content: `Linguagem: ${language}\nMensagem: ${firstMessage}` }],
        maxOutputTokens: 40,
        temperature: 0.3,
      });
      return text.replace(/["'.]/g, "").split("\n")[0]!.slice(0, 60) || fallbackTitle(firstMessage);
    } catch (error) {
      console.error("[AIService] título automático falhou", error);
      return fallbackTitle(firstMessage);
    }
  },
};

function fallbackTitle(message: string) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 40 ? `${clean.slice(0, 40)}…` : clean || "Novo chat";
}

// ---------------------------------------------------------------------------
// Imagens — geração e edição pelo gateway de IA da Lovable (chave server-side).
// ---------------------------------------------------------------------------

const IMAGE_GATEWAY = "https://ai.gateway.lovable.dev/v1";
const IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";

export type GeneratedImage = { base64: string; mimeType: string };

function imageKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AIServiceError("A geração de imagens não está configurada.", 503);
  return key;
}

async function readImageResponse(res: Response): Promise<GeneratedImage> {
  if (!res.ok) {
    const body = await res.text();
    console.error(`[ImageService] falha ${res.status}: ${body.slice(0, 300)}`);
    if (res.status === 402) {
      throw new AIServiceError("Os créditos de imagem da plataforma acabaram.", 402);
    }
    if (res.status === 429) {
      throw new AIServiceError("Muitos pedidos de imagem agora. Tente em instantes.", 429);
    }
    if (res.status === 403) {
      throw new AIServiceError("O gerador de imagens recusou este pedido.", 403);
    }
    throw new AIServiceError("Não foi possível gerar a imagem agora.", 502);
  }

  const json = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
    output_format?: string;
  };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new AIServiceError("A IA não devolveu nenhuma imagem.", 502);
  const format = json.output_format === "jpeg" ? "image/jpeg" : "image/png";
  return { base64: b64, mimeType: format };
}

export const ImageService = {
  async generate(prompt: string): Promise<GeneratedImage> {
    const res = await fetch(`${IMAGE_GATEWAY}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${imageKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt }),
    });
    return readImageResponse(res);
  },

  async edit(
    prompt: string,
    images: { base64: string; mimeType: string; name: string }[],
  ): Promise<GeneratedImage> {
    const form = new FormData();
    form.set("model", IMAGE_MODEL);
    form.set("prompt", prompt);
    for (const image of images) {
      const bytes = Uint8Array.from(atob(image.base64), (c) => c.charCodeAt(0));
      form.append(
        images.length > 1 ? "image[]" : "image",
        new Blob([bytes], { type: image.mimeType }),
        image.name,
      );
    }
    const res = await fetch(`${IMAGE_GATEWAY}/images/edits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${imageKey()}` },
      body: form,
    });
    return readImageResponse(res);
  },
};
