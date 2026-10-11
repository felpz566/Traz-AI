import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { updateProfile } from "@/lib/account.functions";
import { LANGUAGES, MODELS, planName, type ModelId } from "@/lib/felpz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Configurações | Traz AI" },
      { name: "description", content: "Ajuste seu perfil, linguagem e modelo padrão." },
      { property: "og:title", content: "Configurações | Traz AI" },
      { property: "og:description", content: "Ajuste seu perfil, linguagem e modelo padrão." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("TypeScript");
  const [model, setModel] = useState<ModelId>("felpz-fast");
  const [memory, setMemory] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account) return;
    setName(account.name);
    setLanguage((account.preferences?.["defaultLanguage"] as string) ?? "TypeScript");
    setModel(((account.preferences?.["defaultModel"] as ModelId) ?? "felpz-fast") as ModelId);
    setMemory(account.preferences?.["memoryEnabled"] !== false);
  }, [account]);

  async function save() {
    setSaving(true);
    try {
      await updateProfile({
        data: {
          name,
          preferences: {
            ...(account?.preferences ?? {}),
            defaultLanguage: language,
            defaultModel: model,
            memoryEnabled: memory,
          },
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success("Configurações salvas.");
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <SettingsIcon className="size-5 text-primary" /> Configurações
      </h1>

      <Card className="mt-6 space-y-5 border-border bg-card p-5">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>

        <div>
          <Label>Email</Label>
          <Input value={account?.email ?? ""} readOnly disabled className="mt-1" />
        </div>

        <div>
          <Label>Linguagem padrão</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Modelo padrão</Label>
          <Select value={model} onValueChange={(v) => setModel(v as ModelId)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Memória</Label>
            <p className="text-xs text-muted-foreground">
              Deixe a IA lembrar do seu contexto entre conversas.
            </p>
          </div>
          <Switch checked={memory} onCheckedChange={setMemory} />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Plano atual: {account ? planName(account.plan) : "—"}
          </p>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
