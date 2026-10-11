import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AIService } from "./ai.server";

const projectInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(""),
  language: z.string().trim().min(1).max(40).default("TypeScript"),
});

export const listProjects = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("projects").select("*").eq("user_id", context.userId).order("updated_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os projetos.");
  return data ?? [];
});

export const createProject = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => projectInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await (context.supabase as any).from("projects").insert({ user_id: context.userId, ...data }).select("*").single();
    if (error || !row) throw new Error("Não foi possível criar o projeto.");
    return row;
  });

export const updateProject = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), ...projectInput.partial().shape }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await (context.supabase as any).from("projects").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.userId).select("*").single();
    if (error || !row) throw new Error("Projeto não encontrado.");
    return row;
  });

export const deleteProject = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("projects").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível excluir o projeto.");
    return { ok: true };
  });

export const listFiles = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid().optional(), search: z.string().trim().max(100).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    let query = (context.supabase as any).from("files").select("*").eq("user_id", context.userId).order("updated_at", { ascending: false });
    if (data.projectId) query = query.eq("project_id", data.projectId);
    if (data.search) query = query.or(`name.ilike.%${data.search}%,path.ilike.%${data.search}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error("Não foi possível carregar os arquivos.");
    return rows ?? [];
  });

export const upsertFile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid().optional(), projectId: z.string().uuid(), name: z.string().trim().min(1).max(200),
    path: z.string().trim().min(1).max(300), language: z.string().trim().max(40).default("text"),
    content: z.string().max(500_000), favorite: z.boolean().default(false),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: project } = await (context.supabase as any).from("projects").select("id").eq("id", data.projectId).eq("user_id", context.userId).maybeSingle();
    if (!project) throw new Error("Projeto não encontrado.");
    const row = { project_id: data.projectId, user_id: context.userId, name: data.name, path: data.path, language: data.language, content: data.content, size: data.content.length, favorite: data.favorite, updated_at: new Date().toISOString() };
    const result = data.id
      ? await (context.supabase as any).from("files").update(row).eq("id", data.id).eq("user_id", context.userId).select("*").single()
      : await (context.supabase as any).from("files").insert(row).select("*").single();
    if (result.error || !result.data) throw new Error("Não foi possível salvar o arquivo.");
    return result.data;
  });

export const deleteFile = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("files").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível excluir o arquivo.");
    return { ok: true };
  });

export const listSnippets = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("snippets").select("*").eq("user_id", context.userId).order("updated_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os snippets.");
  return data ?? [];
});

export const saveSnippet = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(120), language: z.string().trim().max(40), content: z.string().max(100_000), tags: z.array(z.string().trim().max(30)).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const result = id
      ? await (context.supabase as any).from("snippets").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.userId).select("*").single()
      : await (context.supabase as any).from("snippets").insert({ ...rest, user_id: context.userId }).select("*").single();
    if (result.error || !result.data) throw new Error("Não foi possível salvar o snippet.");
    return result.data;
  });

export const deleteSnippet = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("snippets").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível excluir o snippet.");
    return { ok: true };
  });

export const listKnowledge = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("knowledge_documents").select("*").eq("user_id", context.userId).order("updated_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar a Knowledge Base.");
  return data ?? [];
});

export const saveKnowledge = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(160), content: z.string().max(200_000), type: z.string().trim().max(40).default("text") }).parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const result = id
      ? await (context.supabase as any).from("knowledge_documents").update({ ...rest, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.userId).select("*").single()
      : await (context.supabase as any).from("knowledge_documents").insert({ ...rest, user_id: context.userId }).select("*").single();
    if (result.error || !result.data) throw new Error("Não foi possível salvar o documento.");
    return result.data;
  });

export const deleteKnowledge = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("knowledge_documents").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível excluir o documento.");
    return { ok: true };
  });

const agentSchema = z.enum(["Coding Agent","Debug Agent","Code Review Agent","Refactor Agent","Architecture Agent","Research Agent","Documentation Agent"]);

export const listAgentRuns = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("agent_runs").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error("Não foi possível carregar as execuções.");
  return data ?? [];
});

export const runAgent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ agent: agentSchema, prompt: z.string().trim().min(1).max(8000), language: z.string().trim().max(40).default("TypeScript"), model: z.string().trim().max(40).default("felpz-pro") }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: credit } = await supabase.rpc("consume_credits", { _action: "agent", _cost: 25, _chat_id: null as any, _model: data.model });
    if (!credit?.length) throw new Error("Você não tem créditos suficientes para executar este agente.");
    const { data: run, error } = await (supabase as any).from("agent_runs").insert({ user_id: userId, agent: data.agent, prompt: data.prompt, status: "running", credits_used: 25 }).select("*").single();
    if (error || !run) throw new Error("Não foi possível iniciar o agente.");
    try {
      const result = await AIService.reply({ model: data.model, language: data.language, history: [{ role: "user", content: data.prompt }] });
      const { data: completed } = await (supabase as any).from("agent_runs").update({ status: "completed", result, updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId).select("*").single();
      return completed ?? { ...run, status: "completed", result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao executar o agente.";
      await (supabase as any).from("agent_runs").update({ status: "failed", result: message, updated_at: new Date().toISOString() }).eq("id", run.id).eq("user_id", userId);
      throw new Error(message);
    }
  });
