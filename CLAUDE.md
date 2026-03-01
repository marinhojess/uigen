# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (installs deps, generates Prisma client, runs migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Build and start production
npm run build && npm start

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Reset database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Run migrations
npx prisma migrate dev
```

Requires `ANTHROPIC_API_KEY` in `.env` for real AI generation; without it, the app falls back to a mock provider that generates static example components.

## Architecture

UIGen is a Next.js 15 (App Router) application that lets users generate React components via Claude AI, with live preview and code editing.

### Request Flow

User message → `POST /api/chat` → Claude (claude-haiku-4-5) streams responses with tool calls → tool calls update the **VirtualFileSystem** → JSX files are transpiled with Babel standalone → rendered in a sandboxed iframe.

### Core Abstractions

**VirtualFileSystem** (`src/lib/file-system.ts`) — An in-memory file tree. Components are generated entirely in memory; no disk writes. Serializes to/from JSON for database persistence.

**AI Tool Layer** (`src/lib/tools/`) — Two tools exposed to Claude:
- `str_replace_editor` — create, view, str_replace, insert on files
- `file_manager` — rename and delete files/directories

**JSX Transformation** (`src/lib/transform/jsx-transformer.ts`) — Babel.standalone transpiles JSX → JS, creates an import map pointing React to `esm.sh`, and renders inside a blob URL iframe.

**Language Model Provider** (`src/lib/provider.ts`) — Returns the Anthropic model (claude-haiku-4-5) or a `MockLanguageModel` if no API key is present. The mock generates static Counter/Form/Card components.

### State Management

Two React contexts wrap the entire app (`src/app/main-content.tsx`):

1. **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`) — owns the `VirtualFileSystem` instance, tracks the selected file, and exposes handlers for AI tool call results.
2. **ChatContext** (`src/lib/contexts/chat-context.tsx`) — wraps Vercel AI SDK's `useChat`, wires tool call callbacks into `FileSystemContext`, tracks whether anonymous users have unsaved work.

### UI Layout

`ResizablePanelGroup` (horizontal, via `react-resizable-panels`):
- **Left (35%)** — Chat panel: `ChatInterface` → `MessageList` + `MessageInput`
- **Right (65%)** — Tabbed: **Preview** (`PreviewFrame` iframe) | **Code** (nested `ResizablePanelGroup`: `FileTree` 30% + Monaco `CodeEditor` 70%)

### Database

The schema is defined in `prisma/schema.prisma`. Reference it to understand the structure of data stored in the database.

### Authentication & Persistence

- JWT sessions via `jose` stored in HttpOnly cookies (7-day expiry).
- SQLite database accessed through Prisma. Schema: `User` → many `Project`s. Each `Project` stores `messages` and `data` (full file system) as JSON strings.
- After a streaming response completes, `/api/chat` persists the project to the DB for authenticated users.
- Server actions in `src/actions/` handle auth (signUp, signIn, signOut) and project CRUD.

## Code Style

Use comments sparingly. Only comment complex code.

### Testing

Tests live in `__tests__` directories next to the code they test. Vitest runs with a jsdom environment (`vitest.config.mts`). Testing Library is used for component tests.
