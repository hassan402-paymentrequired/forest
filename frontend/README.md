# Forest

_(Working name — the client hasn't picked a final product name yet. See `lib/config.ts`'s `APP_NAME`.)_

An AI-driven planning assistant for Lagos State secondary schools. Schools attach their data in a chat message, get predictions from a trained planning model, and discuss the results conversationally — grounded in that data, with follow-ups referencing prior context.

This is a customized fork of the open-source [Zola](https://github.com/ibelick/zola) chat interface, rewired to a custom FastAPI backend (`../engine`) instead of Zola's original Supabase-based stack. See `../docs/` for the backend architecture and integration history.

## Features

- Chat-first: attach a spreadsheet, get a grounded prediction and recommendation in the same conversation
- Custom JWT auth against the FastAPI engine (signup/login/forgot-password/reset-password)
- Works with any OpenAI-compatible LLM endpoint (local Ollama by default, swappable via env vars — see `../engine/.env.example`)
- Clean, responsive UI with light/dark themes

## Quick Start

Requires the `engine/` backend running first (see `../engine/README.md`).

```bash
npm install
cp .env.example .env.local   # set ENGINE_URL, JWT_SECRET_KEY (must match engine's), CSRF_SECRET
npm run dev
```

## Built with

- [prompt-kit](https://prompt-kit.com/) — AI components
- [shadcn/ui](https://ui.shadcn.com) — core components
- [motion-primitives](https://motion-primitives.com) — animated components
- [vercel ai sdk](https://vercel.com/blog/introducing-the-vercel-ai-sdk) — model integration, AI features
