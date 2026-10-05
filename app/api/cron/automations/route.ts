import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

export const runtime = "nodejs";

function due(schedule: string, lastRun: string | null, now: Date) {
  if (!lastRun) return true;
  const elapsed = now.getTime() - new Date(lastRun).getTime();
  const interval = schedule === "hourly" ? 60 * 60_000 : schedule === "weekly" ? 7 * 24 * 60 * 60_000 : 24 * 60 * 60_000;
  return elapsed >= interval;
}

export async function GET(req: NextRequest) {
  const secret = process.env.TRAZ_INTERNAL_SECRET;
  const auth = req.headers.get("authorization");
  const cronSecret = req.headers.get("x-vercel-cron-secret");
  if (!secret || (auth !== `Bearer ${secret}` && cronSecret !== secret)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: automations, error } = await admin.from("automations").select("*").eq("enabled", true).limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const ai = new GoogleGenAI({ apiKey: env.aiToken });
  const results = [];
  for (const automation of automations ?? []) {
    if (!due(automation.schedule, automation.last_run_at, now)) continue;
    const run = await admin.from("automation_runs").insert({ automation_id: automation.id, status: "running" }).select("id").single();
    if (run.error || !run.data) continue;
    try {
      const response = await ai.models.generateContent({
        model: env.aiModel,
        contents: [{ role: "user", parts: [{ text: automation.prompt }] }],
        config: { systemInstruction: "You are TRAZ Automation. Execute the scheduled task faithfully. Never expose private chain-of-thought; return only the useful result." },
      });
      await admin.from("automation_runs").update({ status: "success", output: response.text ?? "", finished_at: new Date().toISOString() }).eq("id", run.data.id);
      await admin.from("automations").update({ last_run_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", automation.id);
      results.push({ id: automation.id, status: "success" });
    } catch (error) {
      await admin.from("automation_runs").update({ status: "error", error: error instanceof Error ? error.message : "Automation failed", finished_at: new Date().toISOString() }).eq("id", run.data.id);
      results.push({ id: automation.id, status: "error" });
    }
  }
  return Response.json({ processed: results.length, results });
}
