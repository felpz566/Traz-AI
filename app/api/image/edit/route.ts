import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { consumeUsage } from "@/lib/usage/service";
import { recordAIEvent } from "@/lib/observability";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json() as { prompt?: unknown; data?: unknown; mimeType?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const data = typeof body.data === "string" ? body.data : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/png";
    if (!prompt || !data) return Response.json({ error: "prompt and data are required" }, { status: 400 });
    if (!/^image\/(png|jpeg|webp)$/.test(mimeType)) return Response.json({ error: "Only PNG, JPEG and WebP images are supported." }, { status: 400 });
    if (data.length > 12_000_000) return Response.json({ error: "Image payload is too large." }, { status: 413 });

    const quota = await consumeUsage(auth.supabase, auth.userId, "messages");
    if (!quota.allowed) return Response.json({ error: "Usage limit reached." }, { status: 429 });

    const ai = new GoogleGenAI({ apiKey: env.aiToken });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType, data } }] }],
      config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        void recordAIEvent(auth.supabase, { userId: auth.userId, kind: "image-edit", route: "/api/image/edit", model: "gemini-3.1-flash-image", durationMs: Date.now() - started, success: true });
        return Response.json({ data: { mimeType: part.inlineData.mimeType || "image/png", data: part.inlineData.data } });
      }
    }
    throw new Error("The image model did not return an edited image.");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Image edit failed" }, { status: 500 });
  }
}
