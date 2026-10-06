"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowUp, Bot, Code2, Download, Files, FileText, FlaskConical, FolderKanban, Image as ImageIcon, MemoryStick, Plus, Settings, Sparkles, Trash2, Upload, Users, BarChart3, X, Menu, GitBranch } from "lucide-react";
import { TRAZ_MODELS } from "@/lib/models";

type Chat = { id: string; title: string; updated_at: string };
type Project = { id: string; name: string; description: string | null };
type Agent = { id: string; name: string; model: string; instructions: string };
type ProjectFile = { id: string; name: string; path: string; mime_type: string | null; storage_path: string | null; size_bytes: number | null };
type Usage = { plan: string; usage: { messages: number; files: number; projects: number; agents: number }; limits: { messages: number; files: number; projects: number; agents: number } };
type Observability = { events: number; successRate: number; averageLatencyMs: number; models: string[] };
type Automation = { id:string; name:string; prompt:string; schedule:"hourly"|"daily"|"weekly"; enabled:boolean; last_run_at:string|null };
type Message = { id?: string; role: "user" | "assistant" | "system"; content: string };
type Memory = { id: string; scope: string; content: string };type GitHubRepo = { id:number; full_name:string; name:string; private:boolean; default_branch:string; html_url:string; description:string|null };type GitHubConnection = { connected:boolean; user?:{login:string;name:string|null;avatarUrl:string}; error?:string; repositories?:GitHubRepo[] };

const nav = [
  ["Chats", "chats", Bot], ["Projects", "projects", FolderKanban], ["Files", "files", Files],
  ["Memory", "memory", MemoryStick], ["Agents", "agents", Users], ["Usage", "usage", BarChart3],
  ["Image Studio", "image", ImageIcon], ["Code", "code", Code2], ["Lab", "lab", FlaskConical], ["Automations", "automations", Sparkles], ["Connectors", "connectors", GitBranch], ["Settings", "settings", Settings],
] as const;

const textExtensions = new Set(["txt","md","markdown","json","csv","ts","tsx","js","jsx","py","lua","luau","html","css","sql","xml","yaml","yml","toml","sh","env","log"]);

function extension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function formatBytes(value: number | null) {
  if (!value) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const [view, setView] = useState("chats");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [observability, setObservability] = useState<Observability | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [textPreview, setTextPreview] = useState("");
  const [active, setActive] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [reasoning, setReasoning] = useState<"auto" | "fast" | "think" | "think-more" | "deep-think">("auto");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [imagePrompt,setImagePrompt]=useState("");
  const [imageResult,setImageResult]=useState("");
  const [codeInput,setCodeInput]=useState("");
  const [codeResult,setCodeResult]=useState("");
  const [labPrompt,setLabPrompt]=useState("");
  const [labResult,setLabResult]=useState("");
  const [agentPrompt,setAgentPrompt]=useState("");
  const [agentResult,setAgentResult]=useState("");
  const [selectedAgent,setSelectedAgent]=useState("");
  const [memoryQuery,setMemoryQuery]=useState("");
  const [memoryResults,setMemoryResults]=useState<(Memory & {similarity?:number})[]>([]);
  const [apiKeys,setApiKeys]=useState<{id:string;name:string;key_prefix:string;created_at:string;revoked_at?:string|null}[]>([]);
  const [newApiKey,setNewApiKey]=useState("");  const [github,setGithub]=useState<GitHubConnection|null>(null);  const [githubRepo,setGithubRepo]=useState("");  const [githubPath,setGithubPath]=useState("");  const [githubContext,setGithubContext]=useState("");  const [githubBusy,setGithubBusy]=useState(false);

  async function loadAutomations(){const r=await fetch("/api/automations");if(r.ok)setAutomations((await r.json()).data||[])}
  async function createAutomation(){const name=window.prompt("Automation name");if(!name)return;const prompt=window.prompt("What should TRAZ run?");if(!prompt)return;const schedule=window.prompt("Schedule: hourly, daily or weekly","daily");if(!["hourly","daily","weekly"].includes(schedule||""))return;const r=await fetch("/api/automations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,prompt,schedule})});const j=await r.json();if(!r.ok){setError(j.error||"Could not create automation");return}loadAutomations()}
  async function toggleAutomation(a:Automation){await fetch("/api/automations/"+a.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:!a.enabled})});loadAutomations()}
  async function deleteAutomation(id:string){await fetch("/api/automations/"+id,{method:"DELETE"});loadAutomations()}

  async function loadKeys(){const r=await fetch("/api/keys");if(r.ok)setApiKeys((await r.json()).data||[])}  function connectGitHub(){window.location.href="/api/connectors/github/oauth/start"}  async function loadGitHub(){const r=await fetch("/api/connectors/github");if(r.ok)setGithub(await r.json())}
async function refreshGitHub(){setGithubBusy(true);setError("");try{const r=await fetch("/api/connectors/github",{method:"POST"});const j=await r.json();if(!r.ok)throw new Error(j.error||"GitHub refresh failed");setGithub(j);if(j.repositories?.length&&!githubRepo)setGithubRepo(j.repositories[0].full_name)}catch(e){setError(e instanceof Error?e.message:"GitHub refresh failed")}finally{setGithubBusy(false)}}
  async function disconnectGitHub(){setGithubBusy(true);try{const r=await fetch("/api/connectors/github/disconnect",{method:"POST"});if(!r.ok)throw new Error();setGithub({connected:false});setGithubRepo("");setGithubContext("")}catch{setError("Could not disconnect GitHub")}finally{setGithubBusy(false)}}
  async function addGitHubFile(){
    if(!githubRepo||!githubPath.trim())return;
    setGithubBusy(true);setError("");
    try{
      const [owner,repo]=githubRepo.split("/");
      const r=await fetch(`/api/connectors/github/repos?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(githubPath.trim())}`);
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"Could not read GitHub file");
      const content=j.content?.content;
      const decoded=typeof content==="string"?atob(content.replace(/\\n/g,"")):"";
      setGithubContext(`GitHub: ${githubRepo}/${githubPath.trim()}\\n\\n${decoded}`);
      setView("chats");
      setPrompt((p)=>p||"Analise o arquivo do GitHub que adicionei ao contexto.");
    }catch(e){setError(e instanceof Error?e.message:"Could not read GitHub file")}
    finally{setGithubBusy(false)}
  }
  async function createKey(){const name=window.prompt("API key name");if(!name)return;const r=await fetch("/api/keys",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name})});const j=await r.json();if(!r.ok){setError(j.error||"Could not create API key");return}setNewApiKey(j.data.key);loadKeys()}
  async function revokeKey(id:string){await fetch("/api/keys/"+id,{method:"DELETE"});loadKeys()}
  async function signOut(){await fetch("/api/auth/signout",{method:"POST"});location.href="/login"}

  async function loadAll() {
    try {
      const [c, p, a, u, m, o] = await Promise.all([
        fetch("/api/conversations"), fetch("/api/projects"), fetch("/api/agents"), fetch("/api/usage"), fetch("/api/memories"), fetch("/api/observability"),
      ]);
      if (c.ok) setChats((await c.json()).data || []);
      if (p.ok) {
        const data = (await p.json()).data || [];
        setProjects(data);
        setSelectedProject((current) => current || data[0]?.id || "");
      }
      if (a.ok) setAgents((await a.json()).data || []);
      if (u.ok) setUsage(await u.json());
      if (m.ok) setMemories((await m.json()).data || []);
      if (o.ok) setObservability((await o.json()).data || null);
      loadAutomations();
    } catch {}
  }

  async function loadFiles(projectId: string) {
    if (!projectId) { setFiles([]); return; }
    const r = await fetch(`/api/projects/${projectId}/files`);
    if (r.ok) setFiles((await r.json()).data || []);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubError = params.get("github_error");
    const githubConnected = params.get("github");
    if (githubError) setError(githubError);
    if (githubError || githubConnected) window.history.replaceState({}, "", window.location.pathname);
    loadAll(); loadKeys(); loadGitHub();
  }, []);
  useEffect(() => { loadFiles(selectedProject); setSelectedFile(null); setPreviewUrl(""); setTextPreview(""); }, [selectedProject]);

  async function openChat(id: string) {
    setActive(id); setView("chats"); setAnswer("");
    const r = await fetch("/api/conversations/" + id);
    if (r.ok) setMessages((await r.json()).data.messages || []);
  }

  async function runImage(){if(!imagePrompt.trim())return;setLoading(true);setError("");try{const r=await fetch("/api/image/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:imagePrompt})});const j=await r.json();if(!r.ok)throw new Error(j.error);setImageResult(`data:${j.data.mimeType};base64,${j.data.data}`)}catch(e){setError(e instanceof Error?e.message:"Image generation failed")}finally{setLoading(false)}}
  async function analyzeCode(){if(!codeInput.trim())return;setLoading(true);setError("");try{const r=await fetch("/api/code/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:codeInput})});const j=await r.json();if(!r.ok)throw new Error(j.error);setCodeResult(j.data.text)}catch(e){setError(e instanceof Error?e.message:"Code analysis failed")}finally{setLoading(false)}}
  async function runAgent(){if(!selectedAgent||!agentPrompt.trim())return;setLoading(true);setError("");try{const r=await fetch(`/api/agents/${selectedAgent}/run`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:agentPrompt,projectId:selectedProject||undefined})});const j=await r.json();if(!r.ok)throw new Error(j.error);setAgentResult(j.data.text)}catch(e){setError(e instanceof Error?e.message:"Agent failed")}finally{setLoading(false)}}
  async function searchMemory(){if(!memoryQuery.trim())return;setLoading(true);try{const r=await fetch("/api/memories/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:memoryQuery})});const j=await r.json();if(!r.ok)throw new Error(j.error);setMemoryResults(j.data||[])}catch(e){setError(e instanceof Error?e.message:"Memory search failed")}finally{setLoading(false)}}

  async function runLab(){if(!labPrompt.trim())return;setLoading(true);setError("");try{const r=await fetch("/api/lab/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:labPrompt})});const j=await r.json();if(!r.ok)throw new Error(j.error);setLabResult(j.data.text)}catch(e){setError(e instanceof Error?e.message:"Lab request failed")}finally{setLoading(false)}}

  function newChat() {
    setActive(undefined); setMessages([]); setAnswer(""); setPrompt(""); setView("chats"); setSidebarOpen(false);
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const p = prompt.trim();
    setPrompt(""); setLoading(true); setError(""); setAnswer("");
    let id = active;
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: githubContext ? `${p}\\[Contexto do GitHub]\${githubContext}` : p,
          history: messages.filter((m)=>m.role!=="system").slice(-20).map((m)=>({role:m.role==="assistant"?"model":"user",text:m.content})),
          stream: true,
          conversationId: id,
          mode: reasoning,
          model: selectedModel === "auto" ? undefined : selectedModel
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        throw new Error(body?.error || "Não foi possível concluir a resposta.");
      }
      id = r.headers.get("X-Avenix-Conversation-Id") || id;
      if (id && !active) { setActive(id); await loadAll(); }
      const reader = r.body?.getReader();
      if (!reader) throw new Error();
      const decoder = new TextDecoder();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        setAnswer((v) => v + decoder.decode(value, { stream: true }));
      }
      if (id) {
        const h = await fetch("/api/conversations/" + id);
        if (h.ok) { setMessages((await h.json()).data.messages || []); setAnswer(""); }
      }
      await loadAll();
    } catch(e) { setError(e instanceof Error ? e.message : "Não foi possível concluir a resposta."); }
    finally { setLoading(false); }
  }

  async function createProject() {
    const name = window.prompt("Nome do projeto");
    if (!name) return;
    await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    loadAll();
  }

  async function createAgent() {
    const name = window.prompt("Nome do agente");
    if (!name) return;
    await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    loadAll();
  }

  async function deleteChat(id: string) {
    await fetch("/api/conversations/" + id, { method: "DELETE" });
    if (active === id) newChat();
    loadAll();
  }

  async function deleteMemory(id: string) {
    await fetch("/api/memories/" + id, { method: "DELETE" });
    loadAll();
  }

  async function uploadFile(file: File) {
    if (!selectedProject) { setError("Selecione um projeto antes de enviar um arquivo."); return; }
    if (file.size > 50 * 1024 * 1024) { setError("O limite atual é 50 MB por arquivo."); return; }
    setUploading(true); setError("");
    try {
      const ticket = await fetch(`/api/projects/${selectedProject}/files/upload-url`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size }),
      });
      const ticketJson = await ticket.json();
      if (!ticket.ok) throw new Error(ticketJson.error || "Não foi possível preparar o upload.");
      const { path, token } = ticketJson.data;
      const uploaded = await fetch(ticketJson.data.signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!uploaded.ok) throw new Error("Não foi possível enviar o arquivo para o armazenamento.");

      const registered = await fetch(`/api/projects/${selectedProject}/files`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ticketJson.data.name, path: ticketJson.data.name, storagePath: path,
          mimeType: file.type || "application/octet-stream", sizeBytes: file.size,
        }),
      });
      const registeredJson = await registered.json();
      if (!registered.ok) {
        await fetch(`/api/projects/${selectedProject}/files/upload-url`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) });
        throw new Error(registeredJson.error || "Não foi possível registrar o arquivo.");
      }
      await loadFiles(selectedProject);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally { setUploading(false); }
  }

  async function openFile(file: ProjectFile) {
    setSelectedFile(file); setPreviewUrl(""); setTextPreview("");
    const r = await fetch(`/api/projects/${selectedProject}/files/${file.id}/download`);
    if (!r.ok) { setError("Não foi possível abrir o arquivo."); return; }
    const data = (await r.json()).data;
    setPreviewUrl(data.url);
    if (textExtensions.has(extension(file.name))) {
      const text = await fetch(data.url).then((response) => response.text());
      setTextPreview(text);
    }
  }

  async function deleteFile(file: ProjectFile) {
    const r = await fetch(`/api/projects/${selectedProject}/files/${file.id}`, { method: "DELETE" });
    if (r.ok) {
      if (selectedFile?.id === file.id) { setSelectedFile(null); setPreviewUrl(""); setTextPreview(""); }
      loadFiles(selectedProject);
    }
  }

  const current = chats.find((c) => c.id === active);
  const selectedProjectName = projects.find((p) => p.id === selectedProject)?.name;

  return <div className="traz-shell">
    <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
      <div className="brand">TRAZ</div>
      <button className="new-chat" onClick={newChat}><Plus size={16}/> New Chat</button>
      <nav className="nav">{nav.map(([label, id, Icon]) => <button className={view === id ? "active" : ""} key={id} onClick={() => { setView(id); setSidebarOpen(false); }}><Icon size={16}/>{label}</button>)}</nav>
      <div className="chat-history">{chats.slice(0, 12).map((c) => <div className={active === c.id ? "chat-row selected" : "chat-row"} key={c.id}><button onClick={() => openChat(c.id)}>{c.title || "New chat"}</button><button className="icon-btn" onClick={() => deleteChat(c.id)}><Trash2 size={13}/></button></div>)}</div>
      <div className="muted side-foot">Intelligence, connected.</div>
    </aside>

    <main className="main">
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20}/></button><span className="muted">{view === "chats" ? (current?.title || "TRAZ AI") : nav.find((n) => n[1] === view)?.[0]}</span></div><span className="status"><Sparkles size={14}/> Connected</span></header>
      <section className="content">
        {view === "chats" && <>
          <div className="chat-area">{messages.length === 0 && !answer && !loading ? <div className="hero"><h1>What will you build?</h1><p className="muted">Intelligence, connected.</p></div> : <>{messages.map((m, i) => <div className={`message ${m.role}`} key={m.id || i}><span className="message-role">{m.role === "user" ? "You" : "TRAZ"}</span><div>{m.content}</div></div>)}{(answer || loading) && <div className="message assistant"><span className="message-role">TRAZ</span><div>{answer || "Thinking…"}</div></div>}</>}</div>
          <form className="composer" onSubmit={send}><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask TRAZ anything…"/><div className="composer-footer">{githubContext&&<button type="button" className="secondary" onClick={()=>setView("connectors")} title="GitHub context"><GitBranch size={15}/> GitHub</button>}<select className="select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}><option value="auto">Model: Auto</option>{TRAZ_MODELS.filter((model) => { const rank={free:0,pro:1,r:2,ultra:3} as const; const plan=(usage?.plan||"free") as keyof typeof rank; return rank[model.plan] <= rank[plan]; }).map((model) => <option key={model.id} value={model.id}>{model.id}</option>)}</select><select className="select" value={reasoning} onChange={(e) => setReasoning(e.target.value as typeof reasoning)}><option value="auto">Auto</option><option value="fast">Fast</option><option value="think">Think</option><option value="think-more">Think More</option><option value="deep-think">Deep Think</option></select><button className="send" disabled={loading}><ArrowUp size={17}/></button></div></form>
          {error && <p className="error">{error}</p>}
        </>}

        {view === "projects" && <Panel title="Projects" action="+ New project" onAction={createProject}><div className="card-grid">{projects.map((p) => <div className="card" key={p.id}><div className="card-icon"><FolderKanban/></div><h3>{p.name}</h3><p>{p.description || "AI workspace"}</p><small>Persistent workspace</small></div>)}</div>{!projects.length && <Empty text="Create your first project."/>}</Panel>}

        {view === "files" && <Panel title="Files">
          <div className="file-toolbar">
            <select className="select project-select" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}><option value="">Select a project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <label className={uploading ? "upload-button disabled" : "upload-button"}><Upload size={16}/>{uploading ? "Uploading…" : "Upload file"}<input type="file" hidden disabled={uploading || !selectedProject} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file); e.currentTarget.value = ""; }}/></label>
          </div>
          {selectedProjectName && <p className="muted file-context">{selectedProjectName} · {files.length} file{files.length === 1 ? "" : "s"}</p>}
          <div className="file-layout">
            <div className="file-list">{files.map((file) => <div className={selectedFile?.id === file.id ? "file-row selected" : "file-row"} key={file.id}><button className="file-main" onClick={() => openFile(file)}><FileText size={17}/><span><b>{file.name}</b><small>{file.path} · {formatBytes(file.size_bytes)}</small></span></button><button className="icon-btn" onClick={() => deleteFile(file)} title="Delete"><Trash2 size={14}/></button></div>)}{!files.length && <Empty text={selectedProject ? "No files in this project yet." : "Select a project to manage files."}/>}</div>
            <div className="file-viewer">{selectedFile ? <><div className="viewer-head"><div><b>{selectedFile.name}</b><span>{formatBytes(selectedFile.size_bytes)}</span></div><div><a className="viewer-action" href={previewUrl || "#"} target="_blank" rel="noreferrer"><Download size={15}/> Open</a><button className="icon-btn" onClick={() => { setSelectedFile(null); setPreviewUrl(""); setTextPreview(""); }}><X size={15}/></button></div></div>{previewUrl && textPreview ? <pre className="text-preview">{textPreview}</pre> : previewUrl && selectedFile.mime_type?.startsWith("image/") ? <img className="media-preview" src={previewUrl} alt={selectedFile.name}/> : previewUrl && selectedFile.mime_type === "application/pdf" ? <iframe className="pdf-preview" src={previewUrl} title={selectedFile.name}/> : previewUrl && selectedFile.mime_type?.startsWith("video/") ? <video className="media-preview" src={previewUrl} controls/> : previewUrl && selectedFile.mime_type?.startsWith("audio/") ? <audio className="audio-preview" src={previewUrl} controls/> : <div className="empty">Use Open to view this file.</div>}</> : <Empty text="Select a file to open the TRAZ File Viewer."/>}</div>
          </div>
        </Panel>}

        {view === "memory" && <Panel title="Memory"><div className="studio memory-search"><div className="search-row"><input className="input" value={memoryQuery} onChange={e=>setMemoryQuery(e.target.value)} placeholder="Search memory by meaning…"/><button className="primary" onClick={searchMemory}>Search</button></div>{memoryResults.length>0&&<div className="list">{memoryResults.map(m=><div className="list-row" key={m.id}><div><b>{m.scope}</b><p>{m.content}</p></div><small>{Math.round((m.similarity||0)*100)}%</small></div>)}</div>}</div><div className="list">{memories.map((m) => <div className="list-row" key={m.id}><div><b>{m.scope}</b><p>{m.content}</p></div><button className="icon-btn" onClick={() => deleteMemory(m.id)}><Trash2 size={15}/></button></div>)}</div>{!memories.length && <Empty text="No saved memories yet."/>}</Panel>}
        {view === "agents" && <Panel title="Agents" action="+ New agent" onAction={createAgent}><div className="studio agent-runner"><div className="search-row"><select className="select" value={selectedAgent} onChange={e=>setSelectedAgent(e.target.value)}><option value="">Select an agent</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button className="primary" onClick={runAgent} disabled={loading||!selectedAgent}>Run</button></div><textarea className="studio-input" value={agentPrompt} onChange={e=>setAgentPrompt(e.target.value)} placeholder="Give your agent a task…"/>{agentResult&&<pre className="studio-result">{agentResult}</pre>}</div><div className="card-grid">{agents.map((a) => <div className="card" key={a.id}><div className="card-icon"><Users/></div><h3>{a.name}</h3><p>{a.instructions || "Custom TRAZ agent"}</p><small>{a.model}</small></div>)}</div>{!agents.length && <Empty text="Create your first custom agent."/>}</Panel>}
        {view === "automations" && <Panel title="Automations" action="+ New automation" onAction={createAutomation}><div className="card-grid">{automations.map(a=><div className="card" key={a.id}><div className="card-icon"><Sparkles/></div><h3>{a.name}</h3><p>{a.prompt}</p><small>{a.schedule} · {a.enabled ? "enabled" : "paused"}{a.last_run_at ? ` · last run ${new Date(a.last_run_at).toLocaleString()}` : ""}</small><div className="row-actions"><button className="secondary" onClick={()=>toggleAutomation(a)}>{a.enabled ? "Pause" : "Enable"}</button><button className="icon-btn" onClick={()=>deleteAutomation(a.id)}><Trash2 size={15}/></button></div></div>)}</div>{!automations.length&&<Empty text="Create a scheduled TRAZ automation."/>}</Panel>}
        {view === "usage" && <Panel title="Usage">{usage ? <><div className="usage-grid">{Object.entries(usage.usage).map(([key, value]) => <div className="usage-card" key={key}><span>{key}</span><strong>{value}</strong><small>of {usage.limits[key as keyof typeof usage.limits]}</small><div className="bar"><i style={{ width: `${Math.min(100, (value / (usage.limits[key as keyof typeof usage.limits] || 1)) * 100)}%` }}/></div></div>)}</div>{observability && <div className="card observability-card"><h3>AI Observability</h3><div className="usage-grid"><div className="usage-card"><span>Events</span><strong>{observability.events}</strong><small>last 30 days</small></div><div className="usage-card"><span>Success rate</span><strong>{Math.round(observability.successRate * 100)}%</strong><small>successful requests</small></div><div className="usage-card"><span>Avg latency</span><strong>{observability.averageLatencyMs} ms</strong><small>successful requests</small></div></div><small className="muted">Models: {observability.models.join(", ") || "—"}</small></div>}</> : <Empty text="Sign in to view usage."/>}</Panel>}
        {view==="image"&&<Panel title="Image Studio"><div className="studio"><textarea className="studio-input" value={imagePrompt} onChange={e=>setImagePrompt(e.target.value)} placeholder="Describe the image you want TRAZ to create…"/><button className="primary" onClick={runImage} disabled={loading}>Generate image</button>{imageResult&&<img className="studio-image" src={imageResult} alt="Generated by TRAZ"/>}</div></Panel>}
        {view==="code"&&<Panel title="Code Studio"><div className="studio"><textarea className="code-input" value={codeInput} onChange={e=>setCodeInput(e.target.value)} placeholder="Paste code for review…"/><button className="primary" onClick={analyzeCode} disabled={loading}>Analyze code</button>{codeResult&&<pre className="studio-result">{codeResult}</pre>}</div></Panel>}
        {view==="lab"&&<Panel title="TRAZ Lab"><div className="studio"><textarea className="studio-input" value={labPrompt} onChange={e=>setLabPrompt(e.target.value)} placeholder="Experiment with a prompt, reasoning strategy or model behavior…"/><button className="primary" onClick={runLab} disabled={loading}>Run experiment</button>{labResult&&<pre className="studio-result">{labResult}</pre>}</div></Panel>}
        {view==="connectors"&&<Panel title="Connectors"><div className="card-grid"><div className="card"><div className="card-icon"><GitBranch/></div><h3>GitHub</h3>{github?.connected?<><p>Connected as <b>@{github.user?.login}</b>. TRAZ stores your GitHub credential encrypted and uses it only for your account.</p><div className="search-row"><select className="select" value={githubRepo} onChange={e=>setGithubRepo(e.target.value)}><option value="">Select repository</option>{github.repositories?.map(r=><option key={r.id} value={r.full_name}>{r.full_name}</option>)}</select><button className="primary" onClick={refreshGitHub} disabled={githubBusy}>{githubBusy?"Refreshing…":"Refresh"}</button><button className="secondary" onClick={disconnectGitHub} disabled={githubBusy}>Disconnect</button></div><input className="input" value={githubPath} onChange={e=>setGithubPath(e.target.value)} placeholder="Path, e.g. app/page.tsx"/><button className="primary" onClick={addGitHubFile} disabled={githubBusy||!githubRepo||!githubPath.trim()}>Add file to chat</button>{githubContext&&<pre className="studio-result">GitHub context loaded. Open Chat to use it.</pre>}</>:<><p>Connect your GitHub account to let TRAZ access repositories you authorize.</p><button className="primary" onClick={connectGitHub} disabled={githubBusy}>Connect GitHub</button>{github?.error&&<p className="error">{github.error}</p>}</>}</div></div></Panel>}        {view==="settings"&&<Panel title="Settings"><div className="card-grid"><div className="card"><h3>Account</h3><p>Manage authentication and account preferences.</p><button className="primary" onClick={signOut}>Sign out</button></div><div className="card"><h3>Developer API</h3><p>Create and revoke TRAZ API keys.</p><button className="primary" onClick={createKey}>Create API key</button>{newApiKey&&<pre className="studio-result api-key-once">{newApiKey}</pre>}<div className="list">{apiKeys.map(k=><div className="list-row" key={k.id}><div><b>{k.name}</b><p>{k.key_prefix}••••••</p></div>{!k.revoked_at&&<button className="icon-btn" onClick={()=>revokeKey(k.id)}><Trash2 size={15}/></button>}</div>)}</div></div><div className="card"><h3>Privacy</h3><p>Persistent memory can be reviewed and deleted from the Memory workspace.</p></div></div></Panel>}
      </section>
    </main>
  </div>;
}

function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return <div className="panel"><div className="panel-head"><div><h1>{title}</h1><p className="muted">Persistent TRAZ workspace</p></div>{action && <button className="primary" onClick={onAction}>{action}</button>}</div>{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty"><Sparkles size={20}/><span>{text}</span></div>;
}
