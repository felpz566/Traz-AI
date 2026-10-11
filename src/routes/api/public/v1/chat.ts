import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(8000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .max(30)
    .optional(),
  language: z.string().trim().max(40).optional(),
  model: z.string().trim().max(40).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cache curto da validação da chave: evita 3 consultas ao banco a cada pedido.
const authCache = new Map<string, { id: string; userId: string; exp: number }>();
const AUTH_TTL_MS = 60_000;

export const Route = createFileRoute("/api/public/v1/chat")({
  server: {
    handlers: {
      OPTIONS: () => json({ ok: true }),
      POST: async ({ request }) => {
        const t0 = Date.now();
        let tAuth = t0, tAi = t0;
        const header = request.headers.get("authorization") ?? "";
        const token = header.replace(/^Bearer\s+/i, "").trim();
        if (!token.startsWith("flz_live_")) {
          return json({ error: "Chave de API ausente ou inválida." }, 401);
        }

        let payload: z.infer<typeof bodySchema>;
        try {
          payload = bodySchema.parse(await request.json());
        } catch {
          return json({ error: "Corpo inválido. Envie { message } ou { messages }." }, 400);
        }
        const history = payload.messages?.length
          ? payload.messages
          : payload.message
            ? [{ role: "user" as const, content: payload.message }]
            : [];
        if (!history.length) {
          return json({ error: "Envie uma mensagem." }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const keyHash = await sha256Hex(token);
        let auth = authCache.get(keyHash);
        if (!auth || auth.exp < Date.now()) {
          const { data: apiKey } = await supabaseAdmin
            .from("api_keys")
            .select("id, user_id, revoked_at")
            .eq("key_hash", keyHash)
            .maybeSingle();
          if (!apiKey || apiKey.revoked_at) {
            authCache.delete(keyHash);
            return json({ error: "Chave de API inválida ou revogada." }, 401);
          }
          // Plano do dono da chave: só Plus, Pro e equipe usam a API.
          const [{ data: profile }, { data: isAdmin }] = await Promise.all([
            supabaseAdmin.from("profiles").select("plan").eq("id", apiKey.user_id).maybeSingle(),
            supabaseAdmin.rpc("has_role", { _user_id: apiKey.user_id, _role: "admin" }),
          ]);
          const plan = profile?.plan ?? "free";
          if (!isAdmin && plan !== "plus" && plan !== "pro") {
            return json({ error: "A API é exclusiva dos planos Plus e Pro." }, 403);
          }
          auth = { id: apiKey.id, userId: apiKey.user_id, exp: Date.now() + AUTH_TTL_MS };
          authCache.set(keyHash, auth);
        }
        const apiKey = { id: auth.id, user_id: auth.userId };

        tAuth = Date.now();
        const { AIService, AIServiceError } = await import("@/lib/ai.server");
        const model = payload.model ?? "felpz-fast";

        let reply: string;
        try {
          reply = await AIService.reply({
            model,
            language: payload.language ?? "TypeScript",
            history,
            fast: model === "felpz-fast",
          });
        } catch (error) {
          const status = error instanceof AIServiceError ? error.status : 502;
          const message =
            error instanceof Error ? error.message : "A IA não conseguiu responder agora.";
          return json({ error: message }, status >= 400 && status < 600 ? status : 502);
        }

        tAi = Date.now();
        // Cobrança só depois de a resposta existir; cobrança e registro de uso rodam em paralelo.
        const [usageResult] = await Promise.all([
          supabaseAdmin.rpc("consume_credits_for", {
            _user_id: apiKey.user_id,
            _action: "chat",
            _cost: 2,
            _chat_id: null as any,
            _model: model,
          }),
          supabaseAdmin
            .from("api_keys")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", apiKey.id),
        ]);
        const credits: number | null = (usageResult.data as any)?.[0]?.credits ?? null;

        const tEnd = Date.now();
        return json({
          reply,
          model,
          credits_remaining: credits,
          timing_ms: { auth: tAuth - t0, ai: tAi - tAuth, billing: tEnd - tAi, total: tEnd - t0 },
        });
      },
    },
  },
});
