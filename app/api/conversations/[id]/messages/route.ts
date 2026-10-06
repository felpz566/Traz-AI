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
  const role = body.role === "assistant" || body.role === "system" ? body.role : null;
  const content = typeof body.content === "string" ? body.content : "";
  const model = typeof body.model === "string" ? body.model : null;

  if (!role) return Response.json({ error: "Invalid message role." }, { status: 400 });
  if (!content.trim()) return Response.json({ error: "Message content is required." }, { status: 400 });

  const inserted = await result.supabase.from("messages").insert({
    conversation_id: id,
    user_id: result.userId,
    role,
    content: content.trim(),
    model,
  }).select("*").single();

  if (inserted.error || !inserted.data) {
    console.error("TRAZ message persistence failed", inserted.error);
    return Response.json(
      { error: `Could not save message: ${inserted.error?.message || "unknown database error"}` },
      { status: 500 },
    );
  }

  const touched = await result.supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", result.userId);

  if (touched.error) console.error("TRAZ conversation timestamp update failed", touched.error);

  return Response.json({ data: inserted.data }, { status: 201 });
}
