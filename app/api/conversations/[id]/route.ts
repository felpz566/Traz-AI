import { NextRequest } from "next/server";
import { getConversationForUser } from "@/lib/server/conversations";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await getConversationForUser(id);
  if (!result) return Response.json({ error: "Conversation not found" }, { status: 404 });
  const messages = await result.supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
  if (messages.error) return Response.json({ error: messages.error.message }, { status: 500 });
  return Response.json({ data: { ...result.conversation, messages: messages.data } });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await getConversationForUser(id);
  if (!result) return Response.json({ error: "Conversation not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return Response.json({ error: "title is required" }, { status: 400 });
  const updated = await result.supabase.from("conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", result.userId).select().single();
  if (updated.error) return Response.json({ error: updated.error.message }, { status: 500 });
  return Response.json({ data: updated.data });
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await getConversationForUser(id);
  if (!result) return Response.json({ error: "Conversation not found" }, { status: 404 });
  const deleted = await result.supabase.from("conversations").delete().eq("id", id).eq("user_id", result.userId);
  if (deleted.error) return Response.json({ error: deleted.error.message }, { status: 500 });
  return Response.json({ deleted: true });
}
