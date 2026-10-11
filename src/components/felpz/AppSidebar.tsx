import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bot,
  BookOpen,
  Code2,
  FileCode2,
  FolderKanban,
  Gauge,
  GraduationCap,
  KeyRound,
  LogOut,
  MessagesSquare,
  Plus,
  Settings,
  Shield,
  Sparkles,
  Terminal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { updateProfile } from "@/lib/account.functions";
import { planName } from "@/lib/felpz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const NAV = [
  { to: "/chat", label: "Novo Chat", icon: Plus },
  { to: "/chats", label: "Chats", icon: MessagesSquare },
  { to: "/projects", label: "Projetos", icon: FolderKanban },
  { to: "/files", label: "Arquivos", icon: FileCode2 },
  { to: "/snippets", label: "Snippets", icon: Code2 },
  { to: "/agents", label: "Agentes", icon: Bot },
  { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { to: "/school", label: "Traz School", icon: GraduationCap },
  { to: "/playground", label: "Playground", icon: Terminal },
  { to: "/usage", label: "Uso", icon: Gauge },
  { to: "/api", label: "API", icon: KeyRound },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [adding, setAdding] = useState(false);
  const [newLanguage, setNewLanguage] = useState("");

  async function addLanguage() {
    const value = newLanguage.trim();
    if (!value || !account) return;
    const next = Array.from(new Set([...account.favoriteLanguages, value]));
    try {
      await updateProfile({ data: { favoriteLanguages: next } });
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      setNewLanguage("");
      setAdding(false);
    } catch {
      toast.error("Não foi possível salvar a linguagem.");
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const creditPct = account
    ? Math.round((account.credits / Math.max(account.dailyCreditLimit, 1)) * 100)
    : 0;

  return (
    <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="font-mono text-base font-semibold tracking-tight">Traz AI</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <p className="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Linguagens
        </p>
        <div className="mb-3 flex flex-wrap gap-1 px-2">
          {(account?.favoriteLanguages ?? []).map((lang) => (
            <Link
              key={lang}
              to="/chat"
              search={{ language: lang }}
              onClick={onNavigate}
              className="rounded-md border border-sidebar-border px-2 py-0.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {lang}
            </Link>
          ))}
        </div>
        {adding ? (
          <div className="mb-3 flex gap-1 px-2">
            <Input
              autoFocus
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLanguage()}
              placeholder="Ex.: Kotlin"
              className="h-7 text-xs"
            />
            <Button size="sm" className="h-7" onClick={addLanguage}>
              OK
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mb-3 ml-2 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            + Adicionar linguagem
          </button>
        )}

        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          {account?.isAdmin && (
            <Link
              to="/admin"
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                pathname.startsWith("/admin")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-primary hover:bg-sidebar-accent/60"
              }`}
            >
              <Shield className="size-4" />
              Admin
            </Link>
          )}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-secondary font-mono text-xs uppercase">
            {(account?.name ?? "F").slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{account?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {account ? planName(account.plan) : "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Sair"
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <div className="mt-2">
          <p className="mb-1 font-mono text-xs text-muted-foreground">
            {account?.isAdmin
              ? "∞ créditos"
              : `${account?.credits ?? 0} / ${account?.dailyCreditLimit ?? 0} créditos`}
          </p>
          {!account?.isAdmin && <Progress value={creditPct} className="h-1.5" />}
        </div>
      </div>
    </div>
  );
}
