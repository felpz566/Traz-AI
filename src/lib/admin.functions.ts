import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

/** Métricas e usuários — o servidor confere o papel antes de responder. */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const [{ count: users }, { count: chats }, { count: messages }, { data: logs }, { data: profiles }] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("chats").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase
          .from("usage_logs")
          .select("action, credits_used, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("profiles")
          .select("id, name, email, plan, credits, daily_credit_limit, suspended, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

    const rows = logs ?? [];
    return {
      users: users ?? 0,
      chats: chats ?? 0,
      messages: messages ?? 0,
      creditsUsed: rows.reduce((sum: number, l: any) => sum + l.credits_used, 0),
      agentRuns: rows.filter((l: any) => l.action === "agent").length,
      profiles: profiles ?? [],
    };
  });
