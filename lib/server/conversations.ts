import { getAuthenticatedUserId } from "./auth";

export async function getConversationForUser(id: string) {
  const auth = await getAuthenticatedUserId();
  if (!auth) return null;
  const result = await auth.supabase.from("conversations").select("*").eq("id", id).eq("user_id", auth.userId).maybeSingle();
  if (result.error || !result.data) return null;
  return { supabase: auth.supabase, userId: auth.userId, conversation: result.data };
}

export async function createConversation(title = "New chat") {
  const auth = await getAuthenticatedUserId();
  if (!auth) return null;
  const result = await auth.supabase.from("conversations").insert({ user_id: auth.userId, title: title.trim() || "New chat" }).select().single();
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
