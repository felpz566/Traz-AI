import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Somente administradores e planos pagos podem usar a API externa. */
async function requireApiAccess(supabase: any, userId: string) {
  const [{ data: isAdmin }, { data: profile }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.from("profiles").select("plan").eq("id", userId).maybeSingle(),
  ]);
  const plan = profile?.plan ?? "free";
  if (!isAdmin && plan !== "plus" && plan !== "pro") {
    throw new Error(
      "A API é exclusiva dos planos Plus e Pro (e da equipe). Faça upgrade para criar chaves.",
    );
  }
  return { isAdmin: Boolean(isAdmin), plan };
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const getApiAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      const access = await requireApiAccess(supabase, userId);
      return { allowed: true as const, ...access };
    } catch {
      return { allowed: false as const, isAdmin: false, plan: "free" };
    }
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ name: z.string().trim().min(1).max(60) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireApiAccess(supabase, userId);

    const { count } = await supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("revoked_at", null);
    if ((count ?? 0) >= 10) {
      throw new Error("Você já tem 10 chaves ativas. Revogue alguma antes de criar outra.");
    }

    const random = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const key = `flz_live_${random}`;
    const keyHash = await sha256Hex(key);

    const { data: row, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: userId,
        name: data.name,
        key_prefix: key.slice(0, 14),
        key_hash: keyHash,
      })
      .select("id, name, key_prefix, created_at, revoked_at, last_used_at")
      .single();
    if (error || !row) throw new Error("Não foi possível criar a chave.");

    // A chave completa aparece uma única vez.
    return { ...row, key };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error("Não foi possível revogar a chave.");
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("api_keys").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });
