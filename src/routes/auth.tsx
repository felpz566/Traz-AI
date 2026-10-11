import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Traz AI" },
      {
        name: "description",
        content: "Acesse a Traz AI e converse com uma IA especialista em programação.",
      },
      { property: "og:title", content: "Entrar | Traz AI" },
      { property: "og:description", content: "Acesse sua conta Traz AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "reset";

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "dispostable.com",
  "fakemail.net",
  "maildrop.cc",
  "throwawaymail.com",
  "example.com",
  "test.com",
  "teste.com",
]);

function validateEmail(value: string): string | null {
  const address = value.trim().toLowerCase();
  if (!EMAIL_RE.test(address)) {
    return "Digite um email válido e completo, como nome@gmail.com.";
  }
  const [local = "", domain = ""] = address.split("@");
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return "Use um email real e permanente — emails temporários não são aceitos.";
  }
  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2) return "O final do email parece incorreto.";
  if (local.length < 3) return "A parte antes do @ é curta demais para ser um email real.";
  if (/^\d+$/.test(local)) return "Use um email real, não apenas números antes do @.";
  return null;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch {
      toast.error("Não foi possível entrar com o Google. Verifique a configuração do provedor no Supabase.");
      setGoogleLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const emailProblem = validateEmail(email);
    if (emailProblem) {
      setFormError(emailProblem);
      toast.error(emailProblem);
      return;
    }

    setLoading(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para o seu email.");
        setMode("signin");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada! Confirme o email para entrar.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      let message = raw || "Não foi possível continuar.";
      if (raw.includes("Invalid login credentials")) message = "Email ou senha incorretos.";
      else if (raw.includes("known to be weak") || raw.includes("weak_password"))
        message = "Essa senha é muito comum. Escolha uma senha mais forte e única.";
      else if (raw.includes("already registered") || raw.includes("User already"))
        message = "Esse email já tem conta. Faça login ou recupere a senha.";
      else if (raw.includes("Email not confirmed"))
        message = "Confirme seu email pelo link que enviamos antes de entrar.";
      else if (raw.includes("is invalid") || raw.includes("Unable to validate email"))
        message = "Digite um email válido.";
      else if (raw.includes("at least")) message = "A senha precisa ter pelo menos 6 caracteres.";
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="felpz-grid flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-border bg-card/90 p-8 backdrop-blur">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-mono text-lg font-semibold">Traz AI</span>
        </Link>

        <h1 className="text-xl font-semibold">
          {mode === "signin" && "Entrar na sua conta"}
          {mode === "signup" && "Criar sua conta"}
          {mode === "reset" && "Recuperar senha"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "reset"
            ? "Enviamos um link para você definir uma nova senha."
            : "Sua IA para escrever, revisar e corrigir código."}
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          disabled={googleLoading || loading}
          onClick={handleGoogle}
        >
          {googleLoading ? "Conectando..." : "Entrar com Google"}
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou use seu email
          <span className="h-px flex-1 bg-border" />
        </div>

        {formError && (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode !== "reset" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? "Aguarde..."
              : mode === "signin"
                ? "Entrar"
                : mode === "signup"
                  ? "Criar conta"
                  : "Enviar link"}
          </Button>
        </form>

        <div className="mt-5 space-y-2 text-sm text-muted-foreground">
          {mode !== "signup" && (
            <button type="button" className="hover:text-primary" onClick={() => setMode("signup")}>
              Não tem conta? Criar agora
            </button>
          )}
          {mode !== "signin" && (
            <button
              type="button"
              className="block hover:text-primary"
              onClick={() => setMode("signin")}
            >
              Já tenho conta
            </button>
          )}
          {mode === "signin" && (
            <button
              type="button"
              className="block hover:text-primary"
              onClick={() => setMode("reset")}
            >
              Esqueci minha senha
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
