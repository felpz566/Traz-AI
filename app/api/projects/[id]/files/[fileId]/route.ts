import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server/auth";

const BUCKET = "traz-files";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: projectId, fileId } = await params;
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const file = await auth.supabase
    .from("project_files")
    .select("id,storage_path")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (file.error || !file.data) return Response.json({ error: "File not found" }, { status: 404 });

  if (file.data.storage_path) {
    const removed = await auth.supabase.storage.from(BUCKET).remove([file.data.storage_path]);
    if (removed.error) return Response.json({ error: removed.error.message }, { status: 500 });
  }

  const deleted = await auth.supabase
    .from("project_files")
    .delete()
    .eq("id", fileId)
    .eq("project_id", projectId)
    .eq("user_id", auth.userId);

  if (deleted.error) return Response.json({ error: deleted.error.message }, { status: 500 });
  return Response.json({ ok: true });
}
