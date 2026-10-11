// Constantes compartilhadas entre frontend e backend (seguras para o navegador).

export const LANGUAGES = [
  "Luau",
  "Lua",
  "Python",
  "JavaScript",
  "TypeScript",
  "TSX",
  "HTML",
  "CSS",
  "C#",
  "C++",
  "Java",
  "Rust",
  "Go",
  "SQL",
  "Outra",
] as const;

export const DEFAULT_FAVORITE_LANGUAGES = [
  "Luau",
  "Python",
  "JavaScript",
  "TypeScript",
  "TSX",
  "HTML",
  "CSS",
  "C#",
  "C++",
];

export type ModelId = "traz-fast" | "traz-pro" | "traz-reasoning" | "traz-code";

export const MODELS: {
  id: ModelId;
  name: string;
  description: string;
  costMultiplier: number;
}[] = [
  {
    id: "traz-fast",
    name: "Traz Fast",
    description: "Respostas rápidas para o dia a dia",
    costMultiplier: 1,
  },
  {
    id: "traz-pro",
    name: "Traz Pro",
    description: "Mais qualidade em tarefas complexas",
    costMultiplier: 2,
  },
  {
    id: "traz-reasoning",
    name: "Traz Reasoning",
    description: "Raciocínio passo a passo",
    costMultiplier: 3,
  },
  {
    id: "traz-code",
    name: "Traz Code",
    description: "Focado em geração e revisão de código",
    costMultiplier: 2,
  },
];

export function modelName(id: string) {
  return MODELS.find((m) => m.id === id)?.name ?? "Traz Fast";
}

export const ACTION_COSTS = {
  chat: 2,
  attachment: 3,
  image: 20,
  image_edit: 25,
  component: 5,
  debug: 10,
  review: 10,
  page: 15,
  agent: 25,
} as const;

export type ActionKey = keyof typeof ACTION_COSTS;

export const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "R$0",
    credits: 100,
    features: ["100 créditos por dia", "Todos os modelos Traz", "Chats ilimitados"],
  },
  {
    id: "plus" as const,
    name: "Plus",
    price: "R$29,90",
    credits: 500,
    highlight: true,
    features: ["500 créditos por dia", "Agentes avançados", "Prioridade nas respostas"],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "R$79,90",
    credits: 1000,
    features: ["1000 créditos por dia", "Knowledge Base ampliada", "Suporte dedicado"],
  },
];

export function planName(plan: string) {
  return PLANS.find((p) => p.id === plan)?.name ?? "Free";
}

/** Anexo enviado pelo usuário (arquivo guardado no storage privado). */
export type ChatAttachment = {
  path: string;
  name: string;
  mimeType: string;
  size: number;
};

/** Imagem gerada pela IA e guardada no storage privado. */
export type ChatImage = {
  path: string;
  mimeType: string;
  prompt?: string;
};

export type MessageMetadata = {
  attachments?: ChatAttachment[];
  images?: ChatImage[];
};

export const ATTACHMENT_BUCKET = "chat-uploads";
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;

export function isPreviewableImage(mimeType: string) {
  return mimeType.startsWith("image/");
}
