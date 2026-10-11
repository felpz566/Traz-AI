import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { getUsage } from "@/lib/account.functions";
import { useAccount } from "@/hooks/useAccount";
import { planName } from "@/lib/felpz";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/usage")({
  head: () => ({
    meta: [
      { title: "Uso | Traz AI" },
      { name: "description", content: "Quanto você usou da Traz AI nos últimos dias." },
      { property: "og:title", content: "Uso | Traz AI" },
      { property: "og:description", content: "Quanto você usou da Traz AI nos últimos dias." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsagePage,
});

function UsagePage() {
  const { data: account } = useAccount();
  const usage = useQuery({ queryKey: ["usage"], queryFn: () => getUsage() });
  const max = Math.max(1, ...(usage.data?.weekly.map((d) => d.credits) ?? [1]));

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <Gauge className="size-5 text-primary" /> Uso
      </h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Card className="border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Hoje</p>
          <p className="mt-2 font-mono text-2xl">{usage.data?.usedToday ?? 0}</p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Restantes</p>
          <p className="mt-2 font-mono text-2xl">
            {account?.isAdmin ? "∞" : (account?.credits ?? 0)}
          </p>
        </Card>
        <Card className="border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano</p>
          <p className="mt-2 font-mono text-2xl">{account ? planName(account.plan) : "—"}</p>
        </Card>
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Últimos 7 dias</h2>
      <Card className="border-border bg-card p-5">
        {usage.isLoading ? (
          <Skeleton className="h-32" />
        ) : (
          <div className="flex h-36 items-end gap-3">
            {usage.data?.weekly.map((day, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${(day.credits / max) * 100}%`, minHeight: 2 }}
                  title={`${day.credits} créditos`}
                />
                <span className="text-[10px] text-muted-foreground">{day.day}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
