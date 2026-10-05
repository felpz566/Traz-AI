import { NextRequest } from "next/server";
import { generateWithGemini, streamWithGemini, type TrazMessage } from "@/lib/ai/gemini";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { getApiUserId } from "@/lib/server/api-auth";
import { consumeUsage, getPlan } from "@/lib/usage/service";
import { TRAZ_MODELS } from "@/lib/models";

export const runtime = "nodejs";

type InputMessage = { role?: string; content?: unknown };
type Body = { model?: string; messages?: InputMessage[]; stream?: boolean; temperature?: number };

function normalizeMessages(messages: InputMessage[]): TrazMessage[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "model" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role === "assistant" ? "model" : m.role as "user" | "model", text: String(m.content) }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Body;
    const messages = normalizeMessages(Array.isArray(body.messages) ? body.messages : []);
    if (!messages.length) return Response.json({ error: "messages is required" }, { status: 400 });

    const session = await getAuthenticatedUserId();
    const api = await getApiUserId(request);
    const auth = session ? { userId: session.userId, supabase: session.supabase } : api ? { userId: api.userId, supabase: api.admin } : null;
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const quota = await consumeUsage(auth.supabase, auth.userId, "messages");
    if (!quota.allowed) return Response.json({ error: "Message usage limit reached.", limit: quota.limit, used: quota.used }, { status: 429 });

    const plan = await getPlan(auth.supabase, auth.userId);
    const requested = body.model || "traz-1-fast";
    const selected = TRAZ_MODELS.find((m) => m.id === requested);
    if (!selected) return Response.json({ error: "Unknown model." }, { status: 400 });

    const ranks = { free: 0, pro: 1, r: 2, ultra: 3 } as const;
    if (ranks[selected.plan] > ranks[plan]) return Response.json({ error: "Model is not available for your plan." }, { status: 403 });

    const latest = messages[messages.length - 1];
    const history = messages.slice(0, -1);
    const started = Date.now();

    if (body.stream) {
      const stream = await streamWithGemini({
        prompt: latest.text,
        history,
        systemInstruction: "You are TRAZ AI. Follow the requested model identity and never reveal private chain-of-thought; provide concise reasoning summaries instead.",
      });
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.text ?? "";
              if (!text) continue;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ id: crypto.randomUUID(), object: "chat.completion.chunk", model: selected.id, choices: [{ index: 0, delta: { content: text }, finish_reason: null }] })}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) { controller.error(error); }
        },
      });
      return new Response(readable, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Avenix-Latency-Ms": String(Date.now() - started) } });
    }

    const result = await generateWithGemini({
      prompt: latest.text,
      history,
      systemInstruction: "You are TRAZ AI. Follow the requested model identity and never reveal private chain-of-thought; provide concise reasoning summaries instead.",
    });

    return Response.json({
      id: `chatcmpl_${crypto.randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: selected.id,
      choices: [{ index: 0, message: { role: "assistant", content: result.text }, finish_reason: "stop" }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}
