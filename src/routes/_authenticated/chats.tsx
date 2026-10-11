import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessagesSquare, Trash2 } from "lucide-react";
import { listChats, deleteChat } from "@/lib/chats.functions";
import { modelName } from "@/lib/felpz";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chats")({
  head: () => ({
    meta: [
      { title: "Chats | Traz AI" },
      { name: "description", content: "Todas as suas conversas com a Traz AI." },
      { property: "og:title", content: "Chats | Traz AI" },
      { property: "og:description", content: "Todas as suas conversas com a Traz AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatsPage,
});

function ChatsPage() {
  const queryClient = useQueryClient();
  const chats = useQuery({ queryKey: ["chats"], queryFn: () => listChats() });

  async function remove(chatId: string) {
    if (!confirm("Excluir este chat e suas mensagens?")) return;
    try {
      await deleteChat({ data: { chatId } });
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
    } catch {
      toast.error("Não foi possível excluir o chat.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <MessagesSquare className="size-5 text-primary" /> Chats
        </h1>
        <Link to="/chat">
          <Button>Novo chat</Button>
        </Link>
      </div>

      <Card className="mt-6 divide-y divide-border border-border bg-card">
        {chats.isLoading && <Skeleton className="m-4 h-16" />}
        {!chats.isLoading && (chats.data?.length ?? 0) === 0 && (
          <p className="p-5 text-sm text-muted-foreground">
            Você ainda não tem conversas. Comece um novo chat.
          </p>
        )}
        {chats.data?.map((chat) => (
          <div key={chat.id} className="flex items-center gap-3 px-4 py-3">
            <Link
              to="/chat/$chatId"
              params={{ chatId: chat.id }}
              className="min-w-0 flex-1 transition-colors hover:text-primary"
            >
              <p className="truncate text-sm font-medium">{chat.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {chat.language} · {modelName(chat.model)} ·{" "}
                {new Date(chat.updated_at).toLocaleDateString("pt-BR")}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => remove(chat.id)}
              aria-label="Excluir chat"
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
