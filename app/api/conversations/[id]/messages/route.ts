import { NextRequest } from "next/server";
import { getConversationForUser } from "@/lib/server/conversations";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await getConversationForUser(id);
  if (!result) return Response.json({ error: "Conversation not found" }, { status: 404 });
  const messages = await result.supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true });
  if (messages.error) return Response.json({ error: messages.error.message }, { status: 500 });
  return Response.json({ data: messages.data });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await getConversationForUser(id);
  if (!result) return Response.json({ error: "Conversation not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.content !== "string" || !body.content.trim()) return Response.json({ error: "content is required" }, { status: 400 });
  const role = body.role === "assistant" ? "assistant" : "user";
  const inserted = await result.supabase.from("messages").insert({ conversation_id: id, role, content: body.content.trim(), model: typeof body.model === "string" ? body.model : null }).select().single();
  if (inserted.error) return Response.json({ error: inserted.error.message }, { status: 500 });
  await result.supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", result.userId);
  return Response.json({ data: inserted.data }, { status: 201 });
}
