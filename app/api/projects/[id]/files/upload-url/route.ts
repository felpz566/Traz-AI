import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server/auth";

const BUCKET = "traz-files";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function safeName(input: string) {
  return input
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._'(),!*$@=;:+? -]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "file";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const project = await auth.supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (project.error || !project.data) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "application/octet-stream";
  const sizeBytes = typeof body.sizeBytes === "number" ? body.sizeBytes : 0;

  if (!name) return Response.json({ error: "name is required" }, { status: 400 });
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE) {
    return Response.json({ error: "File must be between 1 byte and 50 MB." }, { status: 400 });
  }

  const storagePath = `${auth.userId}/${projectId}/${crypto.randomUUID()}-${safeName(name)}`;
  const signed = await auth.supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath);

  if (signed.error || !signed.data) {
    return Response.json({ error: signed.error?.message || "Could not create upload URL." }, { status: 500 });
  }

  return Response.json({
    data: {
      path: storagePath,
      token: signed.data.token,
      signedUrl: signed.data.signedUrl,
      name: safeName(name),
      mimeType,
      sizeBytes,
    },
  });
}
