import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as { name?: unknown; prompt?: unknown; schedule?: unknown; enabled?: unknown };
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.prompt === "string") patch.prompt = body.prompt.trim();
  if (typeof body.schedule === "string" && ["hourly", "daily", "weekly"].includes(body.schedule)) patch.schedule = body.schedule;
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  const { data, error } = await auth.supabase.from("automations").update(patch).eq("id", id).eq("user_id", auth.userId).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await auth.supabase.from("automations").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
