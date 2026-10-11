import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SendHorizonal } from "lucide-react";
import { z } from "zod";
import { createChat } from "@/lib/chats.functions";
import { useAccount } from "@/hooks/useAccount";
import { LANGUAGES, MODELS, type ModelId } from "@/lib/felpz";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const searchSchema = z.object({ language: z.string().optional() });

export const Route = createFileRoute("/_authenticated/chat/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Novo chat | Traz AI" },
      { name: "description", content: "Comece uma conversa com a Traz AI sobre o seu código." },
      { property: "og:title", content: "Novo chat | Traz AI" },
      { property: "og:description", content: "Comece uma conversa sobre o seu código." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewChat,
});

function NewChat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: account } = useAccount();
  const search = Route.useSearch();

  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState<string>(
    search.language ?? (account?.preferences?.["defaultLanguage"] as string) ?? "TypeScript",
  );
  const [model, setModel] = useState<ModelId>("felpz-fast");
  const [loading, setLoading] = useState(false);

  async function start() {
    if (!message.trim() || loading) return;
    setLoading(true);
    try {
      const { id } = await createChat({ data: { language, model } });
      sessionStorage.setItem(`felpz:first:${id}`, message.trim());
      await queryClient.invalidateQueries({ queryKey: ["chats"] });
      navigate({ to: "/chat/$chatId", params: { chatId: id } });
    } catch {
      toast.error("Não foi possível criar o chat.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center px-5 py-10">
      <h1 className="text-center text-2xl font-semibold sm:text-3xl">
        Em que você está trabalhando?
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Descreva o problema, cole um erro ou peça um trecho de código.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card p-3">
        <Textarea
          autoFocus
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              start();
            }
          }}
          placeholder="Ex.: Como faço um sistema de inventário no Roblox?"
          className="min-h-28 resize-none border-0 bg-transparent focus-visible:ring-0"
        />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-36">
            <p className="mb-1 text-xs text-muted-foreground">Linguagem foco</p>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-44">
            <p className="mb-1 text-xs text-muted-foreground">Modelo</p>
            <Select value={model} onValueChange={(v) => setModel(v as ModelId)}>
              <SelectTrigger className="h-9">
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
          <Button onClick={start} disabled={loading || !message.trim()} className="ml-auto">
            <SendHorizonal className="size-4" />
            {loading ? "Criando..." : "Começar"}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        A linguagem foco não limita a conversa — ela só define o contexto principal.
      </p>
    </div>
  );
}
