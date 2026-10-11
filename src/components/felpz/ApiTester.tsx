import { useState } from "react";
import { Gauge, Loader2, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Timing = { auth: number; ai: number; billing: number; total: number };
type Result = {
  status: number;
  latency: number;
  body: { reply?: string; error?: string; credits_remaining?: number | null; timing_ms?: Timing } | null;
  raw: string;
};

const MODELS = ["felpz-fast", "felpz-pro", "felpz-reasoning", "felpz-code"];

export function ApiTester() {
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("Diga oi em uma frase.");
  const [model, setModel] = useState("felpz-fast");
  const [language, setLanguage] = useState("JavaScript");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    const start = performance.now();
    try {
      const res = await fetch("/api/public/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key.trim()}` },
        body: JSON.stringify({ message, model, language }),
      });
      const raw = await res.text();
      const latency = Math.round(performance.now() - start);
      let body: Result["body"] = null;
      try {
        body = JSON.parse(raw);
      } catch {
        body = null;
      }
      setResult({ status: res.status, latency, body, raw });
    } catch (e) {
      setResult({
        status: 0,
        latency: Math.round(performance.now() - start),
        body: { error: e instanceof Error ? e.message : "Falha de rede" },
        raw: "",
      });
    } finally {
      setLoading(false);
    }
  }

  const ok = result && result.status >= 200 && result.status < 300;
  const t = result?.body?.timing_ms;

  return (
    <Card className="mt-8 space-y-3 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Gauge className="size-5 text-primary" />
        Testar API
      </h2>
      <p className="text-sm text-muted-foreground">
        Cole sua chave de API e veja a resposta, a latência e os créditos restantes.
      </p>
      <Input
        type="password"
        placeholder="flz_live_..."
        value={key}
        onChange={(e) => setKey(e.target.value)}
        aria-label="Chave de API"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger aria-label="Modelo"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Linguagem" />
      </div>
      <Textarea
        className="min-h-24"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label="Mensagem"
      />
      <Button disabled={loading || !key.trim() || !message.trim()} onClick={run}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Enviar teste
      </Button>

      {result && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={ok ? "default" : "destructive"}>HTTP {result.status || "erro"}</Badge>
            <Badge variant="secondary">Latência total: {result.latency} ms</Badge>
            {result.body?.credits_remaining != null && (
              <Badge variant="outline">Créditos: {result.body.credits_remaining}</Badge>
            )}
          </div>
          {t && (
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {([
                ["Chave", t.auth],
                ["IA", t.ai],
                ["Cobrança", t.billing],
                ["Servidor", t.total],
              ] as const).map(([label, v]) => (
                <div key={label} className="rounded-md bg-secondary p-2">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="font-mono font-semibold">{v} ms</div>
                </div>
              ))}
            </div>
          )}
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{ok ? "Resposta" : "Erro"}</div>
            <p className="whitespace-pre-wrap rounded-md bg-secondary p-3 text-sm">
              {result.body?.reply ?? result.body?.error ?? result.raw}
            </p>
          </div>
          <details>
            <summary className="cursor-pointer text-xs text-muted-foreground">JSON bruto</summary>
            <pre className="mt-2 overflow-auto rounded-md bg-secondary p-3 text-xs">{result.raw}</pre>
          </details>
        </div>
      )}
    </Card>
  );
}
