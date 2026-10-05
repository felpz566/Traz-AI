import { NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/server/auth";
import { consumeUsage } from "@/lib/usage/service";

export async function GET() {
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await auth.supabase.from("automations").select("*").eq("user_id", auth.userId).order("created_at", { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUserId();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const quota = await consumeUsage(auth.supabase, auth.userId, "agents");
  if (quota.plan === "free") return Response.json({ error: "Automations require a paid TRAZ plan." }, { status: 403 });
  if (!quota.allowed) return Response.json({ error: "Automation usage limit reached." }, { status: 429 });
  const body = await req.json() as { name?: unknown; prompt?: unknown; schedule?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const schedule = typeof body.schedule === "string" ? body.schedule.trim() : "";
  if (!name || !prompt || !["hourly", "daily", "weekly"].includes(schedule)) return Response.json({ error: "name, prompt and schedule (hourly|daily|weekly) are required" }, { status: 400 });
  const { data, error } = await auth.supabase.from("automations").insert({ user_id: auth.userId, name, prompt, schedule }).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data }, { status: 201 });
}
