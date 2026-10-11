import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha | Traz AI" },
      { name: "description", content: "Defina uma nova senha para sua conta Traz AI." },
      { property: "og:title", content: "Nova senha | Traz AI" },
      { property: "og:description", content: "Defina uma nova senha para sua conta Traz AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const recovery = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    supabase.auth.getSession().then(({ data }) => setReady(recovery || Boolean(data.session)));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      toast.error("As senhas não são iguais.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("weak")
          ? "Escolha uma senha mais forte e única."
          : "Não foi possível alterar a senha.",
      );
      return;
    }
    toast.success("Senha alterada com sucesso.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-border bg-card p-8">
        <KeyRound className="size-8 text-primary" />
        <h1 className="mt-4 text-xl font-semibold">Definir nova senha</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Este link expirou ou não é válido. Solicite outro link na tela de entrada.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
