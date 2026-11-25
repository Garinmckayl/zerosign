# ZeroSign

**Open-source, self-hostable DocuSign alternative.** Upload a PDF, draw or type your signature, place it on page 1, embed it natively with `pdf-lib`, and download the signed PDF — zero subscriptions, zero vendor lock-in.

## Features (v0.1)

- **PDF Upload & Local Storage** — SQLite + Drizzle ORM metadata with local disk PDF storage.
- **Draw or Type Signature** — Smooth pointer/touch HTML5 signature canvas + cursive typed signature generator.
- **Click-to-Place & Embed** — Click anywhere on page 1 to position your signature and burn it directly into the PDF via `pdf-lib`.
- **Instant Signed PDF Download** — Download the signed PDF immediately.
- **Automated Test Suite** — Vitest unit tests covering `pdf-lib` signature embedding and SQLite/Drizzle document storage.

## Quick Start (Local)

```bash
npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Run Tests

```bash
npm test
```

## Self-Host with Docker Compose

```bash
docker compose up --build -d
```

Data persists in the `zerosign_data` Docker volume (`/app/data`).

## Tech Stack

- **Framework:** Next.js App Router + TypeScript + Tailwind CSS
- **Database:** SQLite (`better-sqlite3`) + Drizzle ORM
- **PDF Engine:** `pdf-lib`
- **Testing:** Vitest
