// Extrai "arquivos" das respostas da IA e monta a árvore mostrada no painel lateral.

export type ProjectFile = {
  path: string;
  language: string;
  code: string;
};

export type FileNode = {
  name: string;
  path: string;
  type: "folder" | "file";
  children: FileNode[];
  file?: ProjectFile;
};

/** Serviços do Roblox usados para reconhecer uma árvore do Roblox Studio. */
export const ROBLOX_SERVICES = [
  "Workspace",
  "ReplicatedStorage",
  "ReplicatedFirst",
  "ServerScriptService",
  "ServerStorage",
  "StarterGui",
  "StarterPack",
  "StarterPlayer",
  "StarterPlayerScripts",
  "StarterCharacterScripts",
  "Lighting",
  "SoundService",
  "Teams",
  "Players",
];

const ROBLOX_SET = new Set(ROBLOX_SERVICES.map((s) => s.toLowerCase()));

const PATH_LIKE = /^[\w.@-]+(?:[\\/][\w.@ -]+)*$/;

function normalizePath(raw: string) {
  return raw
    .trim()
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/^\.\//, "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

/** Lê a "info string" de um bloco de código: ```lua path=ReplicatedStorage/Item.lua */
function parseInfo(info: string): { language: string; path: string | null } {
  const clean = info.trim();
  if (!clean) return { language: "", path: null };

  const tokens = clean.split(/\s+/);
  const language = tokens[0] ?? "";
  let path: string | null = null;

  for (const token of tokens.slice(1)) {
    const withKey = /^(?:path|file|filename)[=:](.+)$/i.exec(token);
    if (withKey && withKey[1]) {
      path = normalizePath(withKey[1]);
      break;
    }
    const candidate = normalizePath(token);
    if (candidate.includes("/") || /\.[A-Za-z0-9]{1,6}$/.test(candidate)) {
      if (PATH_LIKE.test(candidate)) {
        path = candidate;
        break;
      }
    }
  }

  // ```path=src/App.tsx (sem linguagem antes)
  if (!path) {
    const onlyKey = /^(?:path|file|filename)[=:](.+)$/i.exec(language);
    if (onlyKey && onlyKey[1]) {
      return { language: "", path: normalizePath(onlyKey[1]) };
    }
  }

  return { language: language.toLowerCase(), path };
}

/** Todos os blocos de código com caminho, na ordem das mensagens (o último vence). */
export function extractProjectFiles(
  messages: { role: string; content: string }[],
): ProjectFile[] {
  const byPath = new Map<string, ProjectFile>();

  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const parts = message.content.split(/```/g);
    for (let i = 1; i < parts.length; i += 2) {
      const block = parts[i] ?? "";
      const newline = block.indexOf("\n");
      if (newline < 0) continue;
      const { language, path } = parseInfo(block.slice(0, newline));
      if (!path) continue;
      const code = block.slice(newline + 1).replace(/\n+$/, "");
      if (!code.trim()) continue;
      byPath.set(path, { path, language, code });
    }
  }

  return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
}

export function isRobloxTree(files: ProjectFile[]) {
  if (!files.length) return false;
  const roots = files.map((f) => (f.path.split("/")[0] ?? "").toLowerCase());
  return roots.some((root) => ROBLOX_SET.has(root));
}

export function buildFileTree(files: ProjectFile[]): FileNode[] {
  const root: FileNode = { name: "", path: "", type: "folder", children: [] };

  for (const file of files) {
    const segments = file.path.split("/").filter(Boolean);
    let current = root;
    segments.forEach((segment, index) => {
      const isLeaf = index === segments.length - 1;
      const path = segments.slice(0, index + 1).join("/");
      let next = current.children.find((child) => child.name === segment);
      if (!next) {
        next = {
          name: segment,
          path,
          type: isLeaf ? "file" : "folder",
          children: [],
        };
        current.children.push(next);
      }
      if (isLeaf) {
        next.type = "file";
        next.file = file;
      }
      current = next;
    });
  }

  const sort = (nodes: FileNode[]): FileNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => sort(node.children));
    return nodes;
  };

  return sort(root.children);
}

export function fileIcon(path: string) {
  const name = path.toLowerCase();
  if (name.endsWith(".server.lua") || name.endsWith(".server.luau")) return "server";
  if (name.endsWith(".client.lua") || name.endsWith(".client.luau")) return "client";
  if (name.endsWith(".lua") || name.endsWith(".luau")) return "module";
  return "file";
}

/** Texto único com todos os arquivos, para baixar como .txt */
export function filesAsText(files: ProjectFile[]) {
  return files
    .map((file) => `===== ${file.path} =====\n\n${file.code}\n`)
    .join("\n\n");
}
