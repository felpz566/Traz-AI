import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bot, Coins, FolderKanban, Gauge, MessagesSquare, Sparkles } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";
import { getUsage } from "@/lib/account.functions";
import { planName } from "@/lib/felpz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel | Traz AI" },
      { name: "description", content: "Seus créditos, chats e atividade recente na Traz AI." },
      { property: "og:title", content: "Painel | Traz AI" },
      { property: "og:description", content: "Acompanhe créditos, chats e uso da sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: account } = useAccount();
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => getUsage() });

  const cards = [
    {
      icon: Coins,
      label: "Créditos",
      value: account?.isAdmin
        ? "∞"
        : `${account?.credits ?? 0} / ${account?.dailyCreditLimit ?? 0}`,
    },
    { icon: Gauge, label: "Uso hoje", value: `${usage.data?.usedToday ?? 0} créditos` },
    { icon: Sparkles, label: "Plano", value: account ? planName(account.plan) : "—" },
    { icon: MessagesSquare, label: "Chats", value: usage.data?.chats ?? 0 },
    { icon: FolderKanban, label: "Mensagens", value: usage.data?.messages ?? 0 },
    { icon: Bot, label: "Agentes", value: usage.data?.agents ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Olá, {account?.name ?? "dev"} 👋</h1>
        <Link to="/chat">
          <Button>Novo chat</Button>
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <card.icon className="size-4" />
              <span className="text-xs uppercase tracking-wide">{card.label}</span>
            </div>
            <p className="mt-2 font-mono text-2xl">{card.value}</p>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Atividade recente</h2>
      <Card className="divide-y divide-border border-border bg-card">
        {usage.isLoading && <Skeleton className="m-4 h-16" />}
        {!usage.isLoading && (usage.data?.recent.length ?? 0) === 0 && (
          <p className="p-5 text-sm text-muted-foreground">
            Nada por aqui ainda. Comece um chat para ver sua atividade.
          </p>
        )}
        {usage.data?.recent.map((item, index) => (
          <div key={index} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="capitalize">{item.action}</span>
            <span className="text-muted-foreground">
              {new Date(item.createdAt).toLocaleString("pt-BR")} · {item.credits} créditos
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
