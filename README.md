# מדריך הרפרטואר — ז׳ובבה לונדון / Jobava London Repertoire Explainer

A small Next.js app that loads a Jobava London **White** repertoire (PGN tree
with variations) and explains the *rationale* behind each move — the plans,
pawn structures, typical maneuvers, and what each move is trying to achieve.
Explanations are in **Hebrew**, generated offline by Claude and cached, so the
deployed app is fast and costs nothing at runtime.

## How it works

- **PGN → tree.** The repertoire (`data/repertoire.pgn`) is a *tree* with heavy
  use of variations. It is parsed with
  [`@mliebelt/pgn-parser`](https://www.npmjs.com/package/@mliebelt/pgn-parser),
  which preserves **all** variations (RAV), comments and NAGs. Moves are then
  replayed through [`chess.js`](https://www.npmjs.com/package/chess.js) purely
  to produce FENs and validate legality. We deliberately do **not** use
  chess.js's PGN loader, which discards variations.
- **Explanations are pre-generated.** `npm run enrich` walks the whole tree and,
  for every node, asks Claude for a short Hebrew rationale, caching the result
  to `data/explanations.json` keyed by the move-path. The deployed app only
  **reads** this file. Re-running enrich only calls the model for new/changed
  nodes (cache-by-content-hash).
- **Reliability.** Anything concrete (evals, candidate moves, whether the
  repertoire move is the engine's top pick) comes from **Stockfish**, not the
  language model. Single-threaded Stockfish (classical SF10, ~370 KB wasm, no
  NNUE net) runs both offline (grounding the text) and live in the browser via
  a Web Worker (eval bar + top lines in the panel). Single-threaded = **no
  COOP/COEP headers needed**, so it deploys cleanly on Vercel.

## Two ways to generate explanations

The committed `data/explanations.json` is what the app reads. You can fill it
either way:

1. **`npm run build-explanations` (no API key).** Walks the tree, runs Stockfish
   locally for grounding, and composes Hebrew rationales from a curated Jobava
   knowledge base (`scripts/knowledge.ts`). Deterministic, free, re-runnable.
   This is how the committed file was produced.
2. **`npm run enrich` (Anthropic API).** Same grounding, but the verbal "why" is
   written by Claude (`claude-sonnet-4-6` by default; `ENRICH_MODEL` to override).
   Requires `ANTHROPIC_API_KEY`. Caches by content hash, so re-runs only call the
   API for new/changed nodes.

Either way: **commit `data/explanations.json`**, and keep the Vercel Build
Command as plain **`npm run build`** (do NOT run enrich during the build — it
would be slow and would not be persisted to git).

## Project structure

```
data/
  repertoire.pgn        # your White repertoire (the input)
  explanations.json     # generated cache (committed; read at build time)
src/
  app/
    layout.tsx          # RTL, lang="he"
    page.tsx            # Server Component: loads PGN + cache, builds tree
    api/ask/route.ts    # optional live "ask about this position" (server-side)
  components/
    Explorer.tsx        # board + tree + panel, keyboard navigation
    Board.tsx           # react-chessboard (White-oriented, read-only)
    VariationTree.tsx   # clickable PGN-style movetext tree
    NodePanel.tsx       # SAN, original annotation, rationale, engine seam
    AskBox.tsx          # optional follow-up question box
  lib/
    pgn.ts              # parse PGN → tree (preserves all variations)
    tree.ts             # node model + move-path keys
    explanations.ts     # cache types + content hashing
    repertoire.ts       # server-side loaders
    prompt.ts           # shared system/user prompts (Hebrew, guardrails)
    engine.ts           # Stockfish seam (dormant null engine)
scripts/
  enrich.ts             # npm run enrich — pre-generate + cache explanations
  verify-pgn.ts         # npm run verify-pgn — confirm parser keeps all variations
```

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

The app works immediately for navigation. Until you run the enrich step, each
node shows a "no explanation yet" placeholder.

### Verify the parser

```bash
npm run verify-pgn
```

This independently counts the SAN tokens in the PGN and asserts they match the
tree node count, then spot-checks that the deepest variations survived.

## The enrich step (generating explanations)

1. Get an Anthropic API key and put it in an **untracked** `.env.local`:

   ```bash
   cp .env.example .env.local
   # edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
   ```

2. Generate (and cache) explanations for every node:

   ```bash
   npm run enrich
   ```

   Useful flags:

   ```bash
   npm run enrich -- --dry-run      # show what would be generated, no API calls
   npm run enrich -- --limit 20     # generate at most 20 (e.g. a quick sample)
   ```

   - Default model: `claude-sonnet-4-6`. Override for a stronger model:

     ```bash
     ENRICH_MODEL=claude-opus-4-8 npm run enrich
     ```

   - The script checkpoints `data/explanations.json` as it goes and skips nodes
     whose inputs are unchanged, so it's safe and cheap to re-run.

3. Commit the updated `data/explanations.json`. The deployed app reads it
   directly — **no runtime API calls.**

## Environment variables

| Variable            | Where                                   | Purpose                                            |
| ------------------- | --------------------------------------- | -------------------------------------------------- |
| `ANTHROPIC_API_KEY` | local `.env.local` **and** Vercel       | Enrich step + optional `/api/ask`. **Never commit.** |
| `ENRICH_MODEL`      | local (optional)                        | Override the bulk enrichment model.                |
| `ASK_MODEL`         | Vercel/local (optional)                 | Override the model for the live "ask" route.       |

The API key is used **only** server-side (the enrich script and the `/api/ask`
route). It is never exposed to the client.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel (framework: Next.js —
   auto-detected).
2. **Build Command:** keep it as the default **`npm run build`**. The
   explanations are already in `data/explanations.json`, so the build is fast
   and fully static for the main page. (Running enrich in the build is slow and
   its output is not committed back to git — don't do it.)
3. In **Project Settings → Environment Variables**, add `ANTHROPIC_API_KEY`
   only if you want the optional live "ask" box; the pre-generated explanations
   work without it.
4. To update explanations: run `npm run build-explanations` (or `npm run enrich`)
   locally, commit the updated JSON, and push.

Stockfish is single-threaded by design, so **no** COOP/COEP cross-origin
isolation headers are required — it deploys cleanly on Vercel when enabled.

## Navigation

- **Click** any move in the tree to jump to that position.
- **← / →** : back / forward along the current line.
- **↑ / ↓** : cycle between sibling variations at the current branch.

## Updating the repertoire

Replace `data/repertoire.pgn`, run `npm run verify-pgn`, then `npm run enrich`
(only new/changed nodes are regenerated), and commit the updated JSON.
