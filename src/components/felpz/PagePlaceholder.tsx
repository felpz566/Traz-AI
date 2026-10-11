import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
  items,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <Card className="mt-6 border-border bg-card p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Em construção
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">•</span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex gap-2">
          <Link to="/chat">
            <Button>Conversar com a IA</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline">Voltar ao painel</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
