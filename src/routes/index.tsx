import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Bug, Code2, GitPullRequestArrow, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLANS } from "@/lib/felpz";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Traz AI — IA para programadores" },
      {
        name: "description",
        content:
          "Traz AI ajuda você a escrever, entender, corrigir, revisar e arquitetar código em Luau, Python, TypeScript e mais.",
      },
      { property: "og:title", content: "Traz AI — IA para programadores" },
      {
        property: "og:description",
        content: "Escreva, corrija e revise código com uma IA feita para desenvolvedores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Code2, title: "Escrever código", text: "Componentes, scripts e funções prontos para usar." },
  { icon: Bug, title: "Corrigir erros", text: "Cole o erro e receba a causa e a correção." },
  { icon: GitPullRequestArrow, title: "Revisar", text: "Review de código com sugestões objetivas." },
  { icon: Bot, title: "Agentes", text: "Tarefas maiores executadas passo a passo." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-mono text-lg font-semibold">Traz AI</span>
        </div>
        <Link to="/auth">
          <Button variant="secondary">Entrar</Button>
        </Link>
      </header>

      <section className="felpz-grid px-6 py-20 text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
          <Zap className="size-3 text-primary" /> IA especialista em código
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold sm:text-6xl">
          Programe mais rápido com a <span className="text-primary">Traz AI</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-muted-foreground">
          Escreva, entenda, corrija, revise, otimize e arquitete código em Luau, Python,
          TypeScript, C++ e muito mais — tudo em um só lugar.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/auth">
            <Button size="lg">Começar de graça</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <Card key={f.title} className="border-border bg-card p-5">
            <f.icon className="mb-3 size-5 text-primary" />
            <h3 className="font-medium">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-6 text-center text-2xl font-semibold">Planos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`p-6 ${plan.highlight ? "border-primary ring-1 ring-primary" : "border-border"}`}
            >
              {plan.highlight && (
                <span className="mb-2 inline-block rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Mais popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 font-mono text-2xl">
                {plan.price}
                <span className="text-sm text-muted-foreground">/mês</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
