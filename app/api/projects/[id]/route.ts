import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server/auth";

type Context = { params: Promise<{ id: string }> };

async function getProject(id: string) {
  const auth = await getAuthenticatedUserId();
  if (!auth) return null;
  const project = await auth.supabase.from("projects").select("*").eq("id", id).eq("user_id", auth.userId).maybeSingle();
  if (project.error || !project.data) return null;
  return { ...auth, project: project.data };
}

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await getProject(id);
  if (!result) return Response.json({ error: "Project not found" }, { status: 404 });
  const files = await result.supabase.from("project_files").select("*").eq("project_id", id).eq("user_id", result.userId).order("path");
  const conversations = await result.supabase.from("project_conversations").select("conversation_id").eq("project_id", id);
  return Response.json({ data: { ...result.project, files: files.data ?? [], conversationIds: (conversations.data ?? []).map(item => item.conversation_id) } });
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await getProject(id);
  if (!result) return Response.json({ error: "Project not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });
  const updated = await result.supabase.from("projects").update({ name, description: typeof body.description === "string" ? body.description.trim() : null, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", result.userId).select().single();
  if (updated.error) return Response.json({ error: updated.error.message }, { status: 500 });
  return Response.json({ data: updated.data });
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await getProject(id);
  if (!result) return Response.json({ error: "Project not found" }, { status: 404 });
  const deleted = await result.supabase.from("projects").delete().eq("id", id).eq("user_id", result.userId);
  if (deleted.error) return Response.json({ error: deleted.error.message }, { status: 500 });
  return Response.json({ deleted: true });
}
