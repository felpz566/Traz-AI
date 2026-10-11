// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Check, ChevronRight, GraduationCap, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { getExerciseQuiz, getSchoolExercise, getSchoolLevel, listSchoolLevels, completeSchoolExercise, getSchoolProgress } from "@/lib/school.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/school")({ component: SchoolPage });

function SchoolPage() {
  const qc = useQueryClient();
  const levels = useQuery({ queryKey: ["school-levels"], queryFn: () => listSchoolLevels() });
  const progress = useQuery({ queryKey: ["school-progress"], queryFn: () => getSchoolProgress() });
  const [levelId, setLevelId] = useState<string>();
  const [exerciseId, setExerciseId] = useState<string>();
  const [quizOpen, setQuizOpen] = useState(false);
  const level = useQuery({ queryKey: ["school-level", levelId], queryFn: () => getSchoolLevel({ data: { id: levelId! } }), enabled: Boolean(levelId) });
  const exercise = useQuery({ queryKey: ["school-exercise", exerciseId], queryFn: () => getSchoolExercise({ data: { exerciseId: exerciseId! } }), enabled: Boolean(exerciseId) });
  const quiz = useQuery({ queryKey: ["school-quiz", exerciseId], queryFn: () => getExerciseQuiz({ data: { exerciseId: exerciseId! } }), enabled: Boolean(exerciseId) && quizOpen });
  const complete = useMutation({ mutationFn: () => completeSchoolExercise({ data: { exerciseId: exerciseId! } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["school-progress"] }); qc.invalidateQueries({ queryKey: ["school-exercise", exerciseId] }); toast.success("Exercício concluído!"); } });

  const completed = new Set((progress.data ?? []).map((x: any) => x.exercise_id));
  const goBack = () => { if (exerciseId) setExerciseId(undefined); else if (levelId) setLevelId(undefined); else setLevelId(undefined); setQuizOpen(false); };

  if (!levelId) return <div className="mx-auto max-w-5xl px-5 py-8"><header><Badge variant="outline" className="mb-3"><GraduationCap className="mr-1 size-3"/>Luau / Roblox</Badge><h1 className="text-3xl font-semibold">Traz School</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Aprenda Luau passo a passo, do básico à arquitetura de sistemas Roblox.</p></header><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{levels.data?.map((l:any)=><button key={l.id} type="button" onClick={()=>setLevelId(l.id)} className="text-left"><Card className="h-full p-5 transition hover:border-primary/60 hover:bg-accent/20"><div className="flex items-center justify-between"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="size-4"/></span><ChevronRight className="size-4 text-muted-foreground"/></div><h2 className="mt-5 font-semibold">{l.name}</h2><p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{l.description || "Conteúdos de Luau para evoluir suas habilidades."}</p><p className="mt-4 font-mono text-xs text-muted-foreground">Nível {l.display_order + 1}</p></Card></button>)}</div>{levels.data?.length===0&&!levels.isLoading&&<Card className="mt-8 p-8 text-center text-sm text-muted-foreground">A School ainda não possui níveis publicados.</Card>}</div>;

  if (!exerciseId) {
    const exercises = level.data?.exercises ?? [];
    const doneCount = exercises.filter((e:any)=>completed.has(e.id)).length;
    return <div className="mx-auto max-w-4xl px-5 py-8"><Button variant="ghost" onClick={goBack}><ArrowLeft className="size-4"/>Níveis</Button><div className="mt-5"><Badge variant="outline">Traz School</Badge><h1 className="mt-2 text-3xl font-semibold">{level.data?.name}</h1><p className="mt-2 text-sm text-muted-foreground">{level.data?.description}</p><div className="mt-6"><div className="flex justify-between text-xs text-muted-foreground"><span>Progresso</span><span>{doneCount}/{exercises.length}</span></div><Progress className="mt-2" value={exercises.length ? doneCount / exercises.length * 100 : 0}/></div></div><div className="mt-8 space-y-2">{exercises.map((e:any,index:number)=><button key={e.id} type="button" onClick={()=>setExerciseId(e.id)} className="w-full text-left"><Card className="flex items-center gap-4 p-4 transition hover:border-primary/60"><span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${completed.has(e.id) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{completed.has(e.id)?<Check className="size-4"/>:<span className="font-mono text-xs">{index+1}</span>}</span><span className="min-w-0 flex-1"><span className="block font-medium">{e.title}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{e.description}</span></span>{e.retorne_quiz&&<Badge variant="secondary">Quiz</Badge>}<ChevronRight className="size-4 text-muted-foreground"/></Card></button>)}</div></div>;
  }

  if (exercise.isLoading) return <div className="mx-auto max-w-4xl px-5 py-12 text-sm text-muted-foreground">Carregando exercício...</div>;
  const e:any = exercise.data;
  const quizData:any = quiz.data?.quizRetorned ?? {};
  const quizEntries = Object.entries(quizData).filter(([key]) => key !== "length") as [string, Record<string,string>][];
  return <div className="mx-auto max-w-4xl px-5 py-8"><Button variant="ghost" onClick={goBack}><ArrowLeft className="size-4"/>Voltar aos exercícios</Button><Card className="mt-5 p-6"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">Luau</Badge>{e?.retorne_quiz&&<Badge variant="secondary">Quiz incluso</Badge>}{e?.completed&&<Badge><Check className="mr-1 size-3"/>Concluído</Badge>}</div><h1 className="mt-4 text-3xl font-semibold">{e?.title}</h1><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{e?.description}</p>{e?.content&&<div className="mt-6 rounded-lg border bg-secondary/30 p-5"><pre className="whitespace-pre-wrap text-sm leading-6">{e.content}</pre></div>}<div className="mt-6 flex flex-wrap gap-2"><Button onClick={()=>complete.mutate()} disabled={complete.isPending||e?.completed}><Check className="size-4"/>{e?.completed?"Concluído":"Marcar como concluído"}</Button>{e?.retorne_quiz&&<Button variant="outline" disabled={!e?.completed} onClick={()=>setQuizOpen(true)}><Play className="size-4"/>{e?.completed?"Iniciar quiz":"Conclua o exercício para iniciar"}</Button>}</div></Card>{quizOpen&&e?.retorne_quiz&&<Card className="mt-5 p-6"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary"/><h2 className="text-lg font-semibold">Quiz</h2></div><p className="mt-1 text-xs text-muted-foreground">Perguntas selecionadas aleatoriamente.</p>{quiz.isLoading?<p className="mt-5 text-sm text-muted-foreground">Sorteando perguntas...</p>:quizEntries.length===0?<p className="mt-5 text-sm text-muted-foreground">Ainda não há quizzes disponíveis.</p>:<div className="mt-5 space-y-5">{quizEntries.map(([key,item])=><div key={key} className="rounded-lg border p-4"><p className="mb-3 font-medium">Quiz {key}</p>{Object.entries(item).filter(([k])=>k.startsWith("question")).map(([k,v])=><div key={k} className="mb-3"><p className="text-xs uppercase text-muted-foreground">{k}</p><p className="mt-1 text-sm">{v}</p></div>)}<details className="mt-4"><summary className="cursor-pointer text-xs font-medium text-primary">Ver resposta</summary><p className="mt-2 whitespace-pre-wrap rounded bg-secondary p-3 text-xs">{item.respost}</p></details></div>)}</div>}</Card>}</div>;
}
