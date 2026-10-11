import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Preferences = Record<string, string | number | boolean | null>;

export type AccountState = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  plan: "free" | "plus" | "pro";
  credits: number;
  dailyCreditLimit: number;
  favoriteLanguages: string[];
  preferences: Preferences;
  isAdmin: boolean;
};

/** Perfil + papel + créditos do dia, sempre calculados no servidor. */
export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountState> => {
    const { supabase, userId } = context;

    await supabase.rpc("sync_daily_credits");

    const [{ data: profile, error }, { data: isAdmin }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);

    if (error) throw new Error("Não foi possível carregar seu perfil.");
    if (!profile) throw new Error("Perfil não encontrado.");

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatar_url,
      plan: profile.plan,
      credits: profile.credits,
      dailyCreditLimit: profile.daily_credit_limit,
      favoriteLanguages: profile.favorite_languages ?? [],
      preferences: (profile.preferences as Preferences) ?? {},
      isAdmin: Boolean(isAdmin),
    };
  });

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  favoriteLanguages: z.array(z.string().trim().min(1).max(30)).max(30).optional(),
  preferences: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.favoriteLanguages !== undefined)
      patch["favorite_languages"] = Array.from(new Set(data.favoriteLanguages));
    if (data.preferences !== undefined) patch["preferences"] = data.preferences;

    const { error } = await context.supabase
      .from("profiles")
      .update(patch as never)
      .eq("id", context.userId);
    if (error) throw new Error("Não foi possível salvar suas alterações.");
    return { ok: true };
  });

/** Resumo de uso para o dashboard e a página Uso. */
export const getUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: logs }, { count: chatCount }, { count: messageCount }] = await Promise.all([
      supabase
        .from("usage_logs")
        .select("action, model, credits_used, created_at")
        .eq("user_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("chats").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const rows = logs ?? [];
    const usedToday = rows
      .filter((l) => new Date(l.created_at) >= startOfDay)
      .reduce((sum, l) => sum + l.credits_used, 0);

    const perDay: { day: string; credits: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      perDay.push({
        day: d.toLocaleDateString("pt-BR", { weekday: "short" }),
        credits: rows
          .filter((l) => {
            const t = new Date(l.created_at);
            return t >= d && t < next;
          })
          .reduce((sum, l) => sum + l.credits_used, 0),
      });
    }

    return {
      usedToday,
      weekly: perDay,
      chats: chatCount ?? 0,
      messages: messageCount ?? 0,
      agents: rows.filter((l) => l.action === "agent").length,
      recent: rows.slice(0, 10).map((l) => ({
        action: l.action,
        model: l.model,
        credits: l.credits_used,
        createdAt: l.created_at,
      })),
    };
  });
