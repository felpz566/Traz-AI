import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus, Trash2, Pencil, Search } from "lucide-react";
import { useState } from "react";
import { listProjects, createProject, updateProject, deleteProject } from "@/lib/workspace.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects")({ component: ProjectsPage });

function ProjectsPage() {
 const qc=useQueryClient(); const q=useQuery({queryKey:["projects"],queryFn:()=>listProjects()}); const [open,setOpen]=useState(false); const [name,setName]=useState(""); const [description,setDescription]=useState(""); const [language,setLanguage]=useState("TypeScript"); const [search,setSearch]=useState("");
 const create=useMutation({mutationFn:()=>createProject({data:{name,description,language}}),onSuccess:()=>{qc.invalidateQueries({queryKey:["projects"]});setName("");setDescription("");setOpen(false);toast.success("Projeto criado.");},onError:(e:Error)=>toast.error(e.message)});
 const remove=useMutation({mutationFn:(id:string)=>deleteProject({data:{id}}),onSuccess:()=>qc.invalidateQueries({queryKey:["projects"]}),onError:(e:Error)=>toast.error(e.message)});
 const rows=(q.data??[]).filter((p:any)=>p.name.toLowerCase().includes(search.toLowerCase()));
 return <div className="mx-auto max-w-5xl px-5 py-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-semibold"><FolderKanban className="size-5 text-primary"/>Projetos</h1><p className="mt-1 text-sm text-muted-foreground">Organize arquivos, chats e trabalho por projeto.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="size-4"/>Novo projeto</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Criar projeto</DialogTitle></DialogHeader><div className="space-y-3"><Input placeholder="Nome" value={name} onChange={e=>setName(e.target.value)}/><Input placeholder="Linguagem" value={language} onChange={e=>setLanguage(e.target.value)}/><Textarea placeholder="Descrição (opcional)" value={description} onChange={e=>setDescription(e.target.value)}/><Button className="w-full" disabled={!name.trim()||create.isPending} onClick={()=>create.mutate()}>Criar</Button></div></DialogContent></Dialog></div><div className="relative mt-6"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input className="pl-9" placeholder="Pesquisar projetos..." value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="mt-4 grid gap-3 md:grid-cols-2">{q.data?.length===0&&!q.isLoading&&<Card className="p-6 text-sm text-muted-foreground md:col-span-2">Nenhum projeto ainda. Crie o primeiro.</Card>}{rows.map((p:any)=><Card key={p.id} className="p-5"><div className="flex items-start justify-between gap-3"><Link to="/files" search={{projectId:p.id}} className="min-w-0 flex-1"><h2 className="truncate font-semibold hover:text-primary">{p.name}</h2><p className="mt-1 text-xs text-muted-foreground">{p.language} · atualizado {new Date(p.updated_at).toLocaleDateString("pt-BR")}</p><p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description||"Sem descrição."}</p></Link><Button size="icon" variant="ghost" className="text-destructive" onClick={()=>{if(confirm("Excluir este projeto e seus arquivos?"))remove.mutate(p.id)}}><Trash2 className="size-4"/></Button></div></Card>)}</div></div>;
}