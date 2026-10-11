import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, FolderTree, Loader2, Pencil, SendHorizonal, X } from "lucide-react";
import { getChat, sendMessage, updateChat } from "@/lib/chats.functions";
import { LANGUAGES, MODELS, type ModelId } from "@/lib/felpz";
import { extractProjectFiles } from "@/lib/project-files";
import { Markdown } from "@/components/felpz/Markdown";
import { FilesPanel } from "@/components/felpz/FilesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/$chatId")({
  head: () => ({
    meta: [
      { title: "Chat | Traz AI" },
      { name: "description", content: "Converse com a Traz AI sobre o seu código." },
      { property: "og:title", content: "Chat | Traz AI" },
      { property: "og:description", content: "Converse com a Traz AI sobre o seu código." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { chatId } = Route.useParams();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);
  const messageCountBeforeSend = useRef(0);
  const [showFiles, setShowFiles] = useState(true);
  const [mobileFiles, setMobileFiles] = useState(false);

  const chatQuery = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => getChat({ data: { chatId } }),
  });

  const files = useMemo(
    () => extractProjectFiles(chatQuery.data?.messages ?? []),
    [chatQuery.data?.messages],
  );



  const send = useMutation({
    mutationFn: (content: string) => {
      messageCountBeforeSend.current = chatQuery.data?.messages.length ?? 0;
      return sendMessage({ data: { chatId, content } });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["chat", chatId] }),
        queryClient.invalidateQueries({ queryKey: ["account"] }),
        queryClient.invalidateQueries({ queryKey: ["chats"] }),
        queryClient.invalidateQueries({ queryKey: ["usage"] }),
      ]);
    },
    onError: async (error: Error) => {
      const refreshed = await queryClient.fetchQuery({
        queryKey: ["chat", chatId],
        queryFn: () => getChat({ data: { chatId } }),
      });
      const responseWasSaved = refreshed.messages.length > messageCountBeforeSend.current + 1;
      if (!responseWasSaved) toast.error(error.message);
    },
  });

  // primeira mensagem vinda da tela "Novo chat"
  useEffect(() => {
    if (autoSent.current || !chatQuery.data) return;
    const pending = sessionStorage.getItem(`felpz:first:${chatId}`);
    if (pending && chatQuery.data.messages.length === 0) {
      autoSent.current = true;
      sessionStorage.removeItem(`felpz:first:${chatId}`);
      send.mutate(pending);
    }
  }, [chatQuery.data, chatId, send]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatQuery.data?.messages.length, send.isPending]);

  async function patch(patchData: { language?: string; model?: string; title?: string }) {
    await updateChat({ data: { chatId, ...patchData } });
    await queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
    await queryClient.invalidateQueries({ queryKey: ["chats"] });
  }

  if (chatQuery.isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (chatQuery.isError || !chatQuery.data) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Não encontramos este chat.
      </div>
    );
  }

  const { chat, messages } = chatQuery.data;

  return (
    <div className="flex h-[calc(100vh-0px)] lg:h-screen">
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="h-8 w-56"
            />
            <Button
              size="sm"
              onClick={async () => {
                if (titleDraft.trim()) await patch({ title: titleDraft.trim() });
                setEditingTitle(false);
              }}
            >
              <Check className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="group flex items-center gap-2 text-sm font-medium"
            onClick={() => {
              setTitleDraft(chat.title);
              setEditingTitle(true);
            }}
          >
            {chat.title}
            <Pencil className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {files.length > 0 && (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 gap-1 text-xs xl:hidden"
                onClick={() => setMobileFiles(true)}
              >
                <FolderTree className="size-3.5" />
                Arquivos ({files.length})
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="hidden h-8 gap-1 text-xs xl:inline-flex"
                onClick={() => setShowFiles((v) => !v)}
              >
                {showFiles ? <X className="size-3.5" /> : <FolderTree className="size-3.5" />}
                Arquivos ({files.length})
              </Button>
            </>
          )}
          <Select value={chat.language} onValueChange={(v) => patch({ language: v })}>
            <SelectTrigger className="h-8 w-32 text-xs">
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
          <Select value={chat.model} onValueChange={(v) => patch({ model: v as ModelId })}>
            <SelectTrigger className="h-8 w-40 text-xs">
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
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {messages.length === 0 && !send.isPending && (
            <p className="text-center text-sm text-muted-foreground">
              Envie a primeira mensagem para começar.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card"
                }`}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                ) : (
                  <Markdown content={message.content} />
                )}
              </div>
            </div>
          ))}
          {send.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Traz AI está pensando...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-border p-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !send.isPending) {
                  send.mutate(input.trim());
                  setInput("");
                }
              }
            }}
            placeholder="Escreva sua mensagem..."
            className="max-h-40 min-h-11 resize-none"
          />
          <Button
            disabled={send.isPending || !input.trim()}
            onClick={() => {
              send.mutate(input.trim());
              setInput("");
            }}
          >
            <SendHorizonal className="size-4" />
          </Button>
        </div>
      </div>
      </div>

      {files.length > 0 && showFiles && (
        <aside className="hidden w-[26rem] shrink-0 border-l border-border xl:block">
          <FilesPanel files={files} />
        </aside>
      )}

      <Sheet open={mobileFiles} onOpenChange={setMobileFiles}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
          <SheetTitle className="sr-only">Arquivos do projeto</SheetTitle>
          <div className="h-full pt-8">
            <FilesPanel files={files} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
