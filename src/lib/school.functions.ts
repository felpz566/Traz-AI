// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

const levelSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(1000).default(""),
  displayOrder: z.number().int().min(0).max(100000).default(0),
  language: z.literal("Luau").default("Luau"),
});

const exerciseSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).default(""),
  content: z.string().max(100000).default(""),
  levelId: z.string().uuid(),
  retorneQuiz: z.boolean().default(false),
  displayOrder: z.number().int().min(0).max(100000).default(0),
  language: z.literal("Luau").default("Luau"),
});

const quizQuestionSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  respost: z.string().trim().min(1).max(1000),
});

const quizSchema = z.object({
  exerciseId: z.string().uuid(),
  title: z.string().trim().max(160).default(""),
  questions: z.array(quizQuestionSchema).min(2).max(4),
  displayOrder: z.number().int().min(0).max(100000).default(0),
});

export const listSchoolLevels = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("school_levels").select("*").order("display_order").order("created_at");
  if (error) throw new Error("Não foi possível carregar os níveis da Traz School.");
  return data ?? [];
});

export const getSchoolLevel = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: level, error } = await (context.supabase as any).from("school_levels").select("*").eq("id", data.id).maybeSingle();
    if (error || !level) throw new Error("Nível não encontrado.");
    const { data: exercises } = await (context.supabase as any).from("school_exercises").select("*").eq("level_id", data.id).order("display_order").order("created_at");
    return { ...level, exercises: exercises ?? [] };
  });

export const getSchoolExercise = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ exerciseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: exercise, error } = await (context.supabase as any).from("school_exercises").select("*").eq("id", data.exerciseId).maybeSingle();
    if (error || !exercise) throw new Error("Exercício não encontrado.");
    const { data: levels } = await (context.supabase as any).from("school_levels").select("id,name").eq("id", exercise.level_id).maybeSingle();
    const { data: progress } = await (context.supabase as any).from("school_progress").select("completed_at").eq("user_id", context.userId).eq("exercise_id", exercise.id).maybeSingle();
    return { ...exercise, level: levels, completed: Boolean(progress) };
  });

export const getExerciseQuiz = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ exerciseId: z.string().uuid(), amountQuizes: z.number().int().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const amount = data.amountQuizes === undefined ? Math.floor(Math.random() * 3) + 2 : data.amountQuizes;
    if (amount < 2 || amount > 4) throw new Error("amountQuizes deve estar entre 2 e 4.");
    const { data: exercise, error: exerciseError } = await (context.supabase as any).from("school_exercises").select("id,retorne_quiz").eq("id", data.exerciseId).maybeSingle();
    if (exerciseError || !exercise) throw new Error("Exercício não encontrado.");
    if (!exercise.retorne_quiz) return { quizRetorned: { length: 0 } };

    const { data: quizzes, error } = await (context.supabase as any).from("school_quizzes").select("id,display_order").eq("exercise_id", data.exerciseId).order("display_order");
    if (error) throw new Error("Não foi possível carregar os quizzes.");
    const shuffled = [...(quizzes ?? [])].sort(() => Math.random() - 0.5).slice(0, amount);
    if (!shuffled.length) return { quizRetorned: { length: 0 } };

    const ids = shuffled.map((q) => q.id);
    const { data: questions, error: questionError } = await (context.supabase as any).from("school_quiz_questions").select("quiz_id,question_order,question,respost").in("quiz_id", ids).order("question_order");
    if (questionError) throw new Error("Não foi possível carregar as perguntas.");
    const quizRetorned: Record<string, any> = {};
    shuffled.forEach((quiz, index) => {
      const rows = (questions ?? []).filter((q) => q.quiz_id === quiz.id);
      if (rows.length < 2 || rows.length > 4) return;
      const item: Record<string, string> = {};
      rows.forEach((q) => { item[`question${q.question_order}`] = q.question; });
      item.respost = rows.map((q) => q.respost).join("||");
      quizRetorned[index + 1] = item;
    });
    quizRetorned.length = Object.keys(quizRetorned).length;
    return { quizRetorned };
  });

export const completeSchoolExercise = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ exerciseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: exercise } = await (context.supabase as any).from("school_exercises").select("id").eq("id", data.exerciseId).maybeSingle();
    if (!exercise) throw new Error("Exercício não encontrado.");
    const { data: row, error } = await (context.supabase as any).from("school_progress").upsert({ user_id: context.userId, exercise_id: data.exerciseId }, { onConflict: "user_id,exercise_id" }).select("*").single();
    if (error || !row) throw new Error("Não foi possível salvar o progresso.");
    return row;
  });

export const getSchoolProgress = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("school_progress").select("exercise_id,completed_at").eq("user_id", context.userId);
  if (error) throw new Error("Não foi possível carregar o progresso.");
  return data ?? [];
});

export const adminListSchoolData = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context.supabase, context.userId);
  const [{ data: levels }, { data: exercises }, { data: quizzes }, { data: questions }] = await Promise.all([
    (context.supabase as any).from("school_levels").select("*").order("display_order"),
    (context.supabase as any).from("school_exercises").select("*").order("display_order"),
    (context.supabase as any).from("school_quizzes").select("*").order("display_order"),
    (context.supabase as any).from("school_quiz_questions").select("*").order("question_order"),
  ]);
  return { levels: levels ?? [], exercises: exercises ?? [], quizzes: quizzes ?? [], questions: questions ?? [] };
});

export const adminCreateSchoolLevel = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => levelSchema.parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { data: row, error } = await (context.supabase as any).from("school_levels").insert({ name: data.name, description: data.description, display_order: data.displayOrder, language: "Luau" }).select("*").single();
  if (error || !row) throw new Error("Não foi possível criar o nível.");
  return row;
});

export const adminUpdateSchoolLevel = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), ...levelSchema.partial().shape }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { id, displayOrder, ...rest } = data;
  const { data: row, error } = await (context.supabase as any).from("school_levels").update({ ...rest, ...(displayOrder === undefined ? {} : { display_order: displayOrder }), updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error || !row) throw new Error("Nível não encontrado.");
  return row;
});

export const adminDeleteSchoolLevel = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { error } = await (context.supabase as any).from("school_levels").delete().eq("id", data.id);
  if (error) throw new Error("Não foi possível excluir o nível.");
  return { ok: true };
});

export const adminCreateSchoolExercise = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => exerciseSchema.parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { data: level } = await (context.supabase as any).from("school_levels").select("id").eq("id", data.levelId).maybeSingle();
  if (!level) throw new Error("Nível não encontrado.");
  const { data: row, error } = await (context.supabase as any).from("school_exercises").insert({ level_id: data.levelId, title: data.title, description: data.description, content: data.content, retorne_quiz: data.retorneQuiz, display_order: data.displayOrder, language: "Luau" }).select("*").single();
  if (error || !row) throw new Error("Não foi possível criar o exercício.");
  return row;
});

export const adminUpdateSchoolExercise = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), ...exerciseSchema.partial().shape }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { id, levelId, retorneQuiz, displayOrder, ...rest } = data;
  const patch: any = { ...rest, updated_at: new Date().toISOString() };
  if (levelId) patch.level_id = levelId;
  if (retorneQuiz !== undefined) patch.retorne_quiz = retorneQuiz;
  if (displayOrder !== undefined) patch.display_order = displayOrder;
  const { data: row, error } = await (context.supabase as any).from("school_exercises").update(patch).eq("id", id).select("*").single();
  if (error || !row) throw new Error("Exercício não encontrado.");
  return row;
});

export const adminDeleteSchoolExercise = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { error } = await (context.supabase as any).from("school_exercises").delete().eq("id", data.id);
  if (error) throw new Error("Não foi possível excluir o exercício.");
  return { ok: true };
});

export const adminCreateSchoolQuiz = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => quizSchema.parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { data: exercise } = await (context.supabase as any).from("school_exercises").select("id,retorne_quiz").eq("id", data.exerciseId).maybeSingle();
  if (!exercise) throw new Error("Exercício não encontrado.");
  if (!exercise.retorne_quiz) throw new Error("Ative retorneQuiz antes de criar quizzes.");
  const { data: quiz, error } = await (context.supabase as any).from("school_quizzes").insert({ exercise_id: data.exerciseId, title: data.title, display_order: data.displayOrder }).select("*").single();
  if (error || !quiz) throw new Error("Não foi possível criar o quiz.");
  const { error: qError } = await (context.supabase as any).from("school_quiz_questions").insert(data.questions.map((q, i) => ({ quiz_id: quiz.id, question_order: i + 1, question: q.question, respost: q.respost })));
  if (qError) { await (context.supabase as any).from("school_quizzes").delete().eq("id", quiz.id); throw new Error("Não foi possível salvar as perguntas do quiz."); }
  return quiz;
});

export const adminUpdateSchoolQuiz = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), ...quizSchema.omit({ exerciseId: true }).partial().shape }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { id, questions, displayOrder, ...rest } = data;
  const { data: quiz, error } = await (context.supabase as any).from("school_quizzes").update({ ...rest, ...(displayOrder === undefined ? {} : { display_order: displayOrder }), updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error || !quiz) throw new Error("Quiz não encontrado.");
  if (questions) {
    if (questions.length < 2 || questions.length > 4) throw new Error("Um quiz deve possuir entre 2 e 4 perguntas.");
    await (context.supabase as any).from("school_quiz_questions").delete().eq("quiz_id", id);
    const { error: qError } = await (context.supabase as any).from("school_quiz_questions").insert(questions.map((q, i) => ({ quiz_id: id, question_order: i + 1, question: q.question, respost: q.respost })));
    if (qError) throw new Error("Não foi possível atualizar as perguntas.");
  }
  return quiz;
});

export const adminDeleteSchoolQuiz = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase, context.userId);
  const { error } = await (context.supabase as any).from("school_quizzes").delete().eq("id", data.id);
  if (error) throw new Error("Não foi possível excluir o quiz.");
  return { ok: true };
});
