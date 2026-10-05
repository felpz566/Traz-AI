import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server/auth";

const BUCKET = "traz-files";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: projectId, fileId } = await params;
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const file = await auth.supabase
    .from("project_files")
    .select("*")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (file.error || !file.data) return Response.json({ error: "File not found" }, { status: 404 });
  if (!file.data.storage_path) return Response.json({ error: "File has no storage object" }, { status: 409 });

  const signed = await auth.supabase.storage.from(BUCKET).createSignedUrl(file.data.storage_path, 300);
  if (signed.error || !signed.data?.signedUrl) {
    return Response.json({ error: signed.error?.message || "Could not create download URL." }, { status: 500 });
  }

  return Response.json({
    data: {
      url: signed.data.signedUrl,
      name: file.data.name,
      path: file.data.path,
      mimeType: file.data.mime_type,
      sizeBytes: file.data.size_bytes,
    },
  });
}
