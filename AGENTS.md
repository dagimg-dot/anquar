# Anquar

Guilt-free doomscrolling — a Solid.js PWA that turns books into a TikTok-style vertical scroll feed.

## Setup

Anquar depends on **`anquar-core`**, the book chunker, as a local path dependency
(`file:../anquar-core`). It is not published, so it must be cloned as a sibling
directory or `bun install` fails:

```
TYPESCRIPT/
├── anquar-core/
└── anquar/
```

```bash
bun install
bun run dev      # http://localhost:5173
```

No environment variables and no `.env`. The Gemini key is entered in the app
(Settings tab) and lives in `localStorage` under `anquar_api_key`, alongside
`anquar_model`.

## Commands

<!-- TODO -->

## Code Style

<!-- TODO -->

## Architecture

Entirely client-side: no server, no telemetry, no build-time content. The only
request that ever leaves the device is an explicit Explain call.

**Stack** — Solid.js, Vite, Tailwind v4, `vite-plugin-pwa`.

**Routing** — `src/index.tsx` mounts two routes, both rendering `App`: `/` for
the tabs (Feed, Library, Saved, Settings, switched by signal rather than URL)
and `/book/:id` for the reader.

**Import** — `useEpubParser` spawns `src/workers/epub.worker.ts`, which calls
`parseEpubFromFile` from anquar-core. Parsing stays off the main thread so the
feed never janks mid-import. Chapters come back as flat `Block[]`.

**Storage** — Dexie over IndexedDB in `src/lib/db.ts`, database `anquar`,
schema v1. Tables: `books`, `chapters`, `progress`, `bookmarks`,
`readerSettings`, `dailyRollups`, `images`. Image bytes are split into `images`
so chapter JSON stays small; `saveBook` strips them with a replacer.

**Feed** — `src/components/Feed.tsx`. CSS scroll-snap, one card per block,
except that a run of headings shares a card. A card is an *anquar*, the unit
behind the daily goal and reading stats. `useLazyChapters` loads three
chapters at a time behind an IntersectionObserver sentinel, and `loadUpTo` pulls
forward far enough for a contents jump to land.

**Reader chrome** — `ReaderRail` carries contents, explain, save, share and
settings; each opens a `BottomSheet`. The rail overlays the page rather than
reserving a gutter, so it drops `pointer-events` whenever it is not shown.

**Reader settings** — `ReaderSettingsProvider` holds them in context, persisted
per book with a `"global"` row as the fallback for a book opened for the first
time.

**Object URLs** — `covers.ts` and `images.ts` cache one URL per blob, because
minting a fresh one each render reloads the image and flickers. Only covers are
revoked (`releaseCoverUrl`, called by `deleteBook`); image URLs are held for the
life of the page.

## Testing

<!-- TODO -->

## PR / Commit

- Commit messages must be concise, describing what changed and why in present tense.
- Use semantic prefixes: `feat:`, `fix:`, `chore:`, `refactor:`.
- No `Co-authored-by:` or attribution footers.
- Run `bun run check` before committing.
- Keep commits atomic — one logical change per commit.
- **Never commit without explicit user approval.** Wait for confirmation before committing anything.

## Safety

<!-- TODO -->
