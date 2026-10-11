import { useEffect, useMemo, useState } from "react";
import { zipSync, strToU8 } from "fflate";
import {
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  File as FileIcon,
  FileCode2,
  FileText,
  FolderClosed,
  FolderOpen,
  Package,
} from "lucide-react";
import {
  buildFileTree,
  filesAsText,
  isRobloxTree,
  type FileNode,
  type ProjectFile,
} from "@/lib/project-files";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function iconFor(node: FileNode, roblox: boolean) {
  if (node.type === "folder") return null;
  const lower = node.name.toLowerCase();
  if (roblox && (lower.endsWith(".lua") || lower.endsWith(".luau"))) {
    return <FileCode2 className="size-4 shrink-0 text-[oklch(0.75_0.16_60)]" />;
  }
  if (/\.(md|txt|json)$/.test(lower)) {
    return <FileText className="size-4 shrink-0 text-muted-foreground" />;
  }
  if (/\.(ts|tsx|js|jsx|py|cs|cpp|html|css|sql|go|rs|java)$/.test(lower)) {
    return <FileCode2 className="size-4 shrink-0 text-primary" />;
  }
  return <FileIcon className="size-4 shrink-0 text-muted-foreground" />;
}

function TreeNode({
  node,
  depth,
  roblox,
  selected,
  onSelect,
}: {
  node: FileNode;
  depth: number;
  roblox: boolean;
  selected: string | null;
  onSelect: (node: FileNode) => void;
}) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "folder") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-secondary"
          style={{ paddingLeft: depth * 12 + 8 }}
        >
          {open ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          {roblox && depth === 0 ? (
            <Boxes className="size-4 shrink-0 text-primary" />
          ) : open ? (
            <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <FolderClosed className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              roblox={roblox}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-secondary ${
        selected === node.path ? "bg-secondary font-medium" : ""
      }`}
      style={{ paddingLeft: depth * 12 + 22 }}
    >
      {iconFor(node, roblox)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FilesPanel({ files }: { files: ProjectFile[] }) {
  const roblox = useMemo(() => isRobloxTree(files), [files]);
  const tree = useMemo(() => buildFileTree(files), [files]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedPath && files.length) setSelectedPath(files[0]!.path);
  }, [files, selectedPath]);

  const selected = files.find((f) => f.path === selectedPath) ?? files[0] ?? null;

  function downloadZip() {
    const entries: Record<string, Uint8Array> = {};
    for (const file of files) entries[file.path] = strToU8(file.code);
    download(
      roblox ? "felpz-roblox.zip" : "felpz-projeto.zip",
      zipSync(entries, { level: 6 }) as unknown as BlobPart,
      "application/zip",
    );
  }

  if (!files.length) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Package className="size-4 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {roblox ? "Roblox Studio" : "Arquivos do projeto"}
          </p>
          <p className="text-xs text-muted-foreground">
            {files.length} {files.length === 1 ? "arquivo" : "arquivos"}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" className="ml-auto h-8 gap-1 text-xs">
              <Download className="size-3.5" />
              Baixar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={downloadZip}>Tudo em .zip</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                download("felpz-projeto.txt", filesAsText(files), "text/plain;charset=utf-8")
              }
            >
              Tudo em um .txt
            </DropdownMenuItem>
            {selected && (
              <DropdownMenuItem
                onClick={() =>
                  download(
                    selected.path.split("/").pop() || "arquivo.txt",
                    selected.code,
                    "text/plain;charset=utf-8",
                  )
                }
              >
                Só este arquivo
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="max-h-52 shrink-0 overflow-y-auto border-b border-border p-2 lg:max-h-none lg:w-56 lg:border-b-0 lg:border-r">
          {tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              roblox={roblox}
              selected={selected?.path ?? null}
              onSelect={(n) => setSelectedPath(n.path)}
            />
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {selected ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {selected.path}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 gap-1 px-2 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(selected.code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <pre className="min-h-0 flex-1 overflow-auto bg-[oklch(0.13_0.012_265)] p-3 text-xs">
                <code>{selected.code}</code>
              </pre>
            </>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">Selecione um arquivo.</p>
          )}
        </div>
      </div>
    </div>
  );
}
