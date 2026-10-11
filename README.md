# Traz AI

Workspace de inteligência artificial com React, TypeScript, TanStack Start, Supabase e Gemini.

## Desenvolvimento

```bash
bun install
bun run dev
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha as credenciais do seu próprio projeto Supabase e da API Gemini. Nunca envie chaves privadas ao repositório ou ao chat.

## Provedores

- Autenticação e persistência: Supabase.
- Modelos de IA: Google Gemini.
- OAuth Google: configurar o provedor Google no painel do Supabase e definir a URL de redirecionamento da aplicação.
