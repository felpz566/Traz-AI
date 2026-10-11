import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Copy, KeyRound, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createApiKey,
  deleteApiKey,
  getApiAccess,
  listApiKeys,
  revokeApiKey,
} from "@/lib/apikeys.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/api")({
  head: () => ({
    meta: [
      { title: "API | Traz AI" },
      { name: "description", content: "Chaves de acesso para usar a Traz AI de fora." },
      { property: "og:title", content: "API | Traz AI" },
      { property: "og:description", content: "Chaves de acesso para usar a Traz AI de fora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiPage,
});

const ENDPOINT = "https://felpz-ia.lovable.app/api/public/v1/chat";

function snippets(key: string) {
  return {
    JavaScript: `const res = await fetch("${ENDPOINT}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer ${key}",
  },
  body: JSON.stringify({
    message: "Crie uma função que soma dois números",
    language: "JavaScript",
    model: "felpz-fast",
  }),
});

const data = await res.json();
console.log(data.reply);`,
    "Luau (Roblox)": `local HttpService = game:GetService("HttpService")

local res = HttpService:RequestAsync({
	Url = "${ENDPOINT}",
	Method = "POST",
	Headers = {
		["Content-Type"] = "application/json",
		["Authorization"] = "Bearer ${key}",
	},
	Body = HttpService:JSONEncode({
		message = "Crie um script de inventário",
		language = "Luau",
		model = "felpz-code",
	}),
})

local data = HttpService:JSONDecode(res.Body)
print(data.reply)`,
    Python: `import requests

res = requests.post(
    "${ENDPOINT}",
    headers={"Authorization": "Bearer ${key}"},
    json={"message": "Explique list comprehension", "language": "Python"},
)

print(res.json()["reply"])`,
    cURL: `curl -X POST "${ENDPOINT}" \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"Ola Traz","language":"TypeScript"}'`,
  };
}

function CodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        className="absolute right-2 top-2 h-7 gap-1 text-xs"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? "Copiado" : "Copiar"}
      </Button>
      <pre className="overflow-x-auto rounded-lg border border-border bg-secondary/40 p-4 pr-24 font-mono text-xs leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function ApiPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const access = useQuery({ queryKey: ["api-access"], queryFn: () => getApiAccess() });
  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => listApiKeys(),
    enabled: access.data?.allowed === true,
  });

  const create = useMutation({
    mutationFn: (value: string) => createApiKey({ data: { name: value } }),
    onSuccess: async (row) => {
      setNewKey(row.key);
      setName("");
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Chave criada. Copie agora, ela não aparece de novo.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeApiKey({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Chave revogada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteApiKey({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  if (access.isLoading) {
    return <Skeleton className="m-6 h-40" />;
  }

  if (!access.data?.allowed) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <Lock className="mx-auto size-6 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">API disponível nos planos pagos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chaves de API são liberadas para os planos Plus e Pro e para a equipe. Faça upgrade nas
          configurações para criar a sua.
        </p>
      </div>
    );
  }

  const example = snippets(newKey ?? "SUA_CHAVE_AQUI");

  return (
    <div className="mx-auto max-w-4xl px-5 py-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
          <KeyRound className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">API</h1>
          <p className="text-sm text-muted-foreground">
            Use a Traz AI de fora do site: no seu jogo Roblox, no seu app ou no terminal.
          </p>
        </div>
      </div>

      <Card className="mt-6 border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Criar nova chave</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da chave (ex.: Meu jogo Roblox)"
            className="max-w-xs"
          />
          <Button
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate(name.trim())}
            className="gap-1"
          >
            <Plus className="size-4" /> Criar chave
          </Button>
        </div>

        {newKey && (
          <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">
              Copie agora: esta é a única vez que a chave inteira aparece.
            </p>
            <p className="mt-2 break-all font-mono text-sm">{newKey}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-1"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                toast.success("Chave copiada.");
              }}
            >
              <Copy className="size-3" /> Copiar
            </Button>
          </div>
        )}
      </Card>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Suas chaves</h2>
      <Card className="divide-y divide-border border-border bg-card">
        {keys.isLoading && <Skeleton className="m-4 h-12" />}
        {keys.data?.length === 0 && (
          <p className="p-5 text-sm text-muted-foreground">Você ainda não criou nenhuma chave.</p>
        )}
        {keys.data?.map((k: any) => (
          <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {k.name}
                {k.revoked_at && (
                  <span className="ml-2 text-xs text-destructive">revogada</span>
                )}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {k.key_prefix}••••••••••••
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {k.last_used_at
                  ? `Último uso: ${new Date(k.last_used_at).toLocaleDateString("pt-BR")}`
                  : "Nunca usada"}
              </span>
              {!k.revoked_at ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => revoke.mutate(k.id)}
                  disabled={revoke.isPending}
                >
                  Revogar
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove.mutate(k.id)}
                  title="Apagar"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      <h2 className="mt-8 mb-3 text-lg font-semibold">Como usar</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Envie um POST para <span className="font-mono text-xs">{ENDPOINT}</span> com a sua chave no
        cabeçalho. Cada resposta custa 2 créditos da sua conta.
      </p>
      <Tabs defaultValue="JavaScript">
        <TabsList className="flex-wrap">
          {Object.keys(example).map((lang) => (
            <TabsTrigger key={lang} value={lang}>
              {lang}
            </TabsTrigger>
          ))}
        </TabsList>
        {Object.entries(example).map(([lang, code]) => (
          <TabsContent key={lang} value={lang} className="mt-3">
            <CodeBox code={code} />
          </TabsContent>
        ))}
      </Tabs>

      <Card className="mt-6 border-border bg-card p-5 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Campos aceitos</p>
        <ul className="mt-2 space-y-1">
          <li>
            <span className="font-mono text-xs">message</span> — sua pergunta (ou{" "}
            <span className="font-mono text-xs">messages</span> com o histórico)
          </li>
          <li>
            <span className="font-mono text-xs">language</span> — linguagem foco (opcional)
          </li>
          <li>
            <span className="font-mono text-xs">model</span> — felpz-fast, felpz-pro,
            felpz-reasoning ou felpz-code
          </li>
        </ul>
        <p className="mt-3 font-medium text-foreground">Resposta</p>
        <p className="mt-1 font-mono text-xs">
          {"{ reply: string, model: string, credits_remaining: number }"}
        </p>
      </Card>
    </div>
  );
}
