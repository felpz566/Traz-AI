import type { SupabaseClient } from "@supabase/supabase-js";

export type MemoryScope = "user" | "project" | "conversation";
export type NexusMemory = { id: string; scope: MemoryScope; scope_id: string | null; content: string; metadata: Record<string, unknown> | null };

export async function getRelevantMemories(
  supabase: SupabaseClient,
  userId: string,
  input: { conversationId?: string; projectId?: string; limit?: number } = {},
) {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 30);
  const scopes: MemoryScope[] = ["user"];
  if (input.projectId) scopes.push("project");
  if (input.conversationId) scopes.push("conversation");

  const result = await supabase
    .from("memories")
    .select("id,scope,scope_id,content,metadata")
    .eq("user_id", userId)
    .in("scope", scopes)
    .order("updated_at", { ascending: false })
    .limit(limit * 3);

  if (result.error) throw new Error(result.error.message);

  return (result.data ?? [])
    .filter((memory) =>
      memory.scope === "user" ||
      (memory.scope === "project" && memory.scope_id === input.projectId) ||
      (memory.scope === "conversation" && memory.scope_id === input.conversationId),
    )
    .slice(0, limit) as NexusMemory[];
}

export function formatMemoryContext(memories: NexusMemory[]) {
  if (!memories.length) return "";
  return [
    "Relevant persistent memory:",
    ...memories.map((memory, index) => `[${index + 1}] (${memory.scope}) ${memory.content}`),
    "Use these memories only when relevant. Do not mention this memory block unless it helps answer the user.",
  ].join("\n");
}
