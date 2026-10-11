import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  ACTION_COSTS,
  ATTACHMENT_BUCKET,
  LANGUAGES,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MODELS,
} from "./felpz";

const languageSchema = z.enum(LANGUAGES as unknown as [string, ...string[]]);
const modelSchema = z.enum(MODELS.map((m) => m.id) as [string, ...string[]]);

export const listChats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chats")
      .select("id, title, language, model, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Não foi possível carregar seus chats.");
    return data ?? [];
  });

export const createChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ language: languageSchema, model: modelSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: chat, error } = await context.supabase
      .from("chats")
      .insert({
        user_id: context.userId,
        language: data.language,
        model: data.model,
        title: "Novo chat",
      })
      .select("id")
      .single();
    if (error || !chat) throw new Error("Não foi possível criar o chat.");
    return { id: chat.id };
  });

export const getChat = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ chatId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: chat } = await context.supabase
      .from("chats")
      .select("id, title, language, model, created_at")
      .eq("id", data.chatId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!chat) throw new Error("Chat não encontrado.");

    const { data: messages } = await context.supabase
      .from("messages")
      .select("id, role, content, created_at, metadata")
      .eq("chat_id", chat.id)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });

    return { chat, messages: messages ?? [] };
  });

export const updateChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        chatId: z.string().uuid(),
        title: z.string().trim().min(1).max(80).optional(),
        language: languageSchema.optional(),
        model: modelSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.title) {
      patch["title"] = data.title;
      patch["title_generated"] = true;
    }
    if (data.language) patch["language"] = data.language;
    if (data.model) patch["model"] = data.model;

    const { error } = await context.supabase
      .from("chats")
      .update(patch as never)
      .eq("id", data.chatId)
      .eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível atualizar o chat.");
    return { ok: true };
  });

export const deleteChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ chatId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chats")
      .delete()
      .eq("id", data.chatId)
      .eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível excluir o chat.");
    return { ok: true };
  });

/**
 * Envia uma mensagem: valida dono, cobra créditos no banco (transação),
 * chama a IA e salva as duas mensagens.
 */
const attachmentSchema = z.object({
  path: z.string().min(1).max(400),
  name: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().min(0).max(MAX_ATTACHMENT_BYTES),
});

type ChatClient = SupabaseClient<Database>;

/** Confere saldo antes de chamar a IA (admins não gastam créditos). */
async function ensureCredits(
  supabase: ChatClient,
  userId: string,
  cost: number,
  messages: { notEnough: string },
) {
  const [{ data: isAdmin }, { data: profile, error }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.from("profiles").select("credits, suspended").eq("id", userId).maybeSingle(),
  ]);
  if (error || !profile) throw new Error("Não foi possível validar seus créditos.");
  if (profile.suspended) throw new Error("Sua conta está suspensa.");
  if (!isAdmin && (profile.credits ?? 0) < cost) throw new Error(messages.notEnough);
}

/** Desconta os créditos depois que o trabalho deu certo. */
async function chargeCredits(
  supabase: ChatClient,
  opts: { action: string; cost: number; chatId: string; model: string },
) {
  const { data, error } = await supabase.rpc("consume_credits", {
    _action: opts.action,
    _cost: opts.cost,
    _chat_id: opts.chatId,
    _model: opts.model,
  });
  if (error) {
    console.error("[credits]", error);
    return null;
  }
  return Array.isArray(data) ? (data[0] ?? null) : data;
}


export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        chatId: z.string().uuid(),
        content: z.string().trim().min(1).max(8000),
        attachments: z.array(attachmentSchema).max(MAX_ATTACHMENTS).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: chat } = await supabase
      .from("chats")
      .select("id, title, language, model, title_generated")
      .eq("id", data.chatId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!chat) throw new Error("Chat não encontrado.");

    const attachments = (data.attachments ?? []).filter((a) =>
      a.path.startsWith(`${userId}/`),
    );
    const cost = ACTION_COSTS.chat + attachments.length * ACTION_COSTS.attachment;

    // 1) créditos: só conferimos agora. A cobrança acontece depois que a IA
    // responder, para o usuário nunca perder créditos por uma falha nossa.
    await ensureCredits(supabase, userId, cost, {
      notEnough: attachments.length
        ? `Você não tem créditos suficientes: esta mensagem custa ${cost} créditos (${ACTION_COSTS.chat} da mensagem + ${ACTION_COSTS.attachment} por anexo). Remova anexos ou espere a renovação de amanhã.`
        : "Seus créditos de hoje acabaram. Eles voltam amanhã ou com um plano maior.",
    });


    const { data: userMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        chat_id: chat.id,
        user_id: userId,
        role: "user",
        content: data.content,
        ...(attachments.length ? { metadata: { attachments } } : {}),
      })
      .select("id, role, content, created_at, metadata")
      .single();
    if (insertError || !userMessage) throw new Error("Não foi possível salvar sua mensagem.");

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", chat.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(40);

    const { AIService, AIServiceError } = await import("./ai.server");

    // anexos: imagens/pdf vão como dados; texto vira contexto na conversa
    const inline: { mimeType: string; data: string }[] = [];
    const textParts: string[] = [];
    for (const attachment of attachments) {
      const file = await supabase.storage.from(ATTACHMENT_BUCKET).download(attachment.path);
      if (file.error || !file.data) continue;
      const buffer = new Uint8Array(await file.data.arrayBuffer());
      if (attachment.mimeType.startsWith("image/") || attachment.mimeType === "application/pdf") {
        let binary = "";
        for (const byte of buffer) binary += String.fromCharCode(byte);
        inline.push({ mimeType: attachment.mimeType, data: btoa(binary) });
      } else {
        const text = new TextDecoder().decode(buffer).slice(0, 40000);
        textParts.push(`Arquivo anexado "${attachment.name}":\n\`\`\`\n${text}\n\`\`\``);
      }
    }

    const messagesForAI = (history ?? []).map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));
    if (textParts.length && messagesForAI.length) {
      const last = messagesForAI[messagesForAI.length - 1]!;
      last.content = `${last.content}\n\n${textParts.join("\n\n")}`;
    }

    let answer: string;
    try {
      answer = await AIService.reply({
        model: chat.model,
        language: chat.language,
        history: messagesForAI,
        ...(inline.length ? { attachments: inline } : {}),
      });
    } catch (error) {
      const friendly =
        error instanceof AIServiceError ? error.message : "A IA não conseguiu responder agora.";
      throw new Error(friendly);
    }

    const { data: assistantMessage } = await supabase
      .from("messages")
      .insert({ chat_id: chat.id, user_id: userId, role: "assistant", content: answer })
      .select("id, role, content, created_at, metadata")
      .single();

    // cobrança só depois da resposta pronta
    const creditRow = await chargeCredits(supabase, {
      action: attachments.length ? "chat_attachment" : "chat",
      cost,
      chatId: chat.id,
      model: chat.model,
    });


    // 2) título automático somente na primeira mensagem
    let title = chat.title;
    if (!chat.title_generated) {
      title = await AIService.generateTitle(data.content, chat.language);
      await supabase
        .from("chats")
        .update({ title, title_generated: true, updated_at: new Date().toISOString() })
        .eq("id", chat.id)
        .eq("user_id", userId);
    } else {
      await supabase
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", chat.id)
        .eq("user_id", userId);
    }

    return {
      userMessage,
      assistantMessage,
      title,
      credits: creditRow?.credits ?? 0,
      isAdmin: creditRow?.is_admin ?? false,
    };
  });

/**
 * Gera (ou edita) uma imagem dentro do chat. Os créditos são cobrados no
 * servidor antes da chamada e a imagem fica no storage privado do usuário.
 */
export const generateImageMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        chatId: z.string().uuid(),
        prompt: z.string().trim().min(3).max(2000),
        sources: z.array(attachmentSchema).max(3).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: chat } = await supabase
      .from("chats")
      .select("id, title, language, model, title_generated")
      .eq("id", data.chatId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!chat) throw new Error("Chat não encontrado.");

    const sources = (data.sources ?? []).filter(
      (s) => s.path.startsWith(`${userId}/`) && s.mimeType.startsWith("image/"),
    );
    const isEdit = sources.length > 0;
    const cost = isEdit ? ACTION_COSTS.image_edit : ACTION_COSTS.image;

    await ensureCredits(supabase, userId, cost, {
      notEnough: `Você não tem créditos suficientes: ${isEdit ? "editar" : "gerar"} uma imagem custa ${cost} créditos. Seus créditos voltam amanhã ou com um plano maior.`,
    });


    const { data: userMessage } = await supabase
      .from("messages")
      .insert({
        chat_id: chat.id,
        user_id: userId,
        role: "user",
        content: isEdit ? `Editar imagem: ${data.prompt}` : `Gerar imagem: ${data.prompt}`,
        ...(sources.length ? { metadata: { attachments: sources } } : {}),
      })
      .select("id, role, content, created_at, metadata")
      .single();

    const { ImageService, AIServiceError } = await import("./ai.server");

    let image: { base64: string; mimeType: string };
    try {
      if (isEdit) {
        const files: { base64: string; mimeType: string; name: string }[] = [];
        for (const source of sources) {
          const file = await supabase.storage.from(ATTACHMENT_BUCKET).download(source.path);
          if (file.error || !file.data) continue;
          const buffer = new Uint8Array(await file.data.arrayBuffer());
          let binary = "";
          for (const byte of buffer) binary += String.fromCharCode(byte);
          files.push({ base64: btoa(binary), mimeType: source.mimeType, name: source.name });
        }
        if (!files.length) throw new Error("Não foi possível ler a imagem enviada.");
        image = await ImageService.edit(data.prompt, files);
      } else {
        image = await ImageService.generate(data.prompt);
      }
    } catch (error) {
      const friendly =
        error instanceof AIServiceError ? error.message : "Não foi possível gerar a imagem agora.";
      throw new Error(friendly);
    }

    const extension = image.mimeType === "image/jpeg" ? "jpg" : "png";
    const path = `${userId}/gerados/${crypto.randomUUID()}.${extension}`;
    const bytes = Uint8Array.from(atob(image.base64), (c) => c.charCodeAt(0));
    const upload = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, bytes, { contentType: image.mimeType, upsert: false });
    if (upload.error) {
      console.error("[image upload]", upload.error);
      throw new Error("A imagem foi criada, mas não pôde ser salva.");
    }

    const { data: assistantMessage } = await supabase
      .from("messages")
      .insert({
        chat_id: chat.id,
        user_id: userId,
        role: "assistant",
        content: isEdit ? "Imagem editada." : "Imagem gerada.",
        metadata: { images: [{ path, mimeType: image.mimeType, prompt: data.prompt }] },
      })
      .select("id, role, content, created_at, metadata")
      .single();

    const creditRow = await chargeCredits(supabase, {
      action: isEdit ? "image_edit" : "image",
      cost,
      chatId: chat.id,
      model: chat.model,
    });

    let title = chat.title;
    if (!chat.title_generated) {
      const { AIService } = await import("./ai.server");
      title = await AIService.generateTitle(data.prompt, chat.language);
      await supabase
        .from("chats")
        .update({ title, title_generated: true, updated_at: new Date().toISOString() })
        .eq("id", chat.id)
        .eq("user_id", userId);
    } else {
      await supabase
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", chat.id)
        .eq("user_id", userId);
    }

    return {
      userMessage,
      assistantMessage,
      title,
      credits: creditRow?.credits ?? 0,
      isAdmin: creditRow?.is_admin ?? false,
    };
  });
