import { generateWithGemini } from "@/lib/ai/gemini";

export async function extractMemories(text: string) {
  if (text.trim().length < 80) return [];
  const result = await generateWithGemini({
    prompt: `Extract durable user facts/preferences that would be useful in future conversations. Ignore transient requests, secrets, passwords, tokens, financial credentials, health information, and sensitive personal data. Return ONLY a JSON array of short strings. If there is nothing durable, return [].\n\nText:\n${text.slice(0, 6000)}`,
    systemInstruction: "You are a memory extraction component. Never invent facts. Return valid JSON only.",
  });
  try {
    const parsed: unknown = JSON.parse(result.text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 2 && item.trim().length < 500).slice(0, 5);
  } catch {
    return [];
  }
}
