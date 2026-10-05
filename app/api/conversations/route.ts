import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { createConversation } from "@/lib/server/conversations";

export async function GET() {
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await auth.supabase.from("conversations").select("*").eq("user_id", auth.userId).order("updated_at", { ascending: false });
  if (result.error) return Response.json({ error: result.error.message }, { status: 500 });
  return Response.json({ data: result.data });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : "New chat";
  const conversation = await createConversation(title);
  return Response.json({ data: conversation }, { status: 201 });
}
