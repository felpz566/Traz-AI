import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { formatMemoryContext, getRelevantMemories } from "@/lib/memory/service";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const memories = await getRelevantMemories(auth.supabase, auth.userId, {
    conversationId: url.searchParams.get("conversationId") || undefined,
    projectId: url.searchParams.get("projectId") || undefined,
  });

  return Response.json({ data: memories, context: formatMemoryContext(memories) });
}
