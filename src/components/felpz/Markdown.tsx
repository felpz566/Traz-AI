import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function ProseBlock({ content }: { content: string }) {
  const lines = content.trim().split("\n");
  return (
    <div className="space-y-2.5 break-words">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (/^-{3,}$/.test(trimmed)) return <hr key={index} className="my-4 border-border" />;
        const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);
        if (heading) {
          const level = heading[1]?.length ?? 4;
          const headingText = heading[2] ?? "";
          return (
            <p
              key={index}
              className={level <= 2 ? "pt-2 text-base font-semibold" : "pt-1 font-semibold"}
            >
              <InlineMarkdown text={headingText} />
            </p>
          );
        }
        const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
        if (bullet) {
          return (
            <div key={index} className="flex gap-2 pl-1">
              <span aria-hidden="true">•</span>
              <p>
                <InlineMarkdown text={bullet[1] ?? ""} />
              </p>
            </div>
          );
        }
        const numbered = /^(\d+)\.\s+(.+)$/.exec(trimmed);
        if (numbered) {
          return (
            <div key={index} className="flex gap-2 pl-1">
              <span className="shrink-0">{numbered[1]}.</span>
              <p>
                <InlineMarkdown text={numbered[2] ?? ""} />
              </p>
            </div>
          );
        }
        return (
          <p key={index}>
            <InlineMarkdown text={trimmed} />
          </p>
        );
      })}
    </div>
  );
}

/** Renderiza Markdown da IA e blocos de código com botão copiar. */
export function Markdown({ content }: { content: string }) {
  const blocks = content.split(/```/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        if (index % 2 === 1) {
          const newline = block.indexOf("\n");
          const info = newline > -1 ? block.slice(0, newline).trim() : "";
          const code = newline > -1 ? block.slice(newline + 1) : block;
          const pathMatch = /(?:path|file|filename)[=:]([^\s]+)/i.exec(info);
          const lang = pathMatch ? info.split(/\s+/)[0] ?? "" : info;
          return (
            <CodeBlock
              key={index}
              language={pathMatch?.[1] ?? lang}
              code={code.replace(/\n$/, "")}
            />
          );
        }
        if (!block.trim()) return null;
        return <ProseBlock key={index} content={block} />;
      })}
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[oklch(0.13_0.012_265)]">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground">{language || "código"}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs">
        <code>{code}</code>
      </pre>
    </div>
  );
}
