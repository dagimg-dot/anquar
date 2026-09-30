# Anquar

Guilt-free doomscrolling — a Solid.js PWA that turns books into a TikTok-style vertical scroll feed.

## Setup

Anquar depends on **`anquar-core`**, the book parser and paginator, as a local
path dependency (`file:../anquar-core`). It is not published, so it must be
cloned as a sibling directory or `bun install` fails:

```
TYPESCRIPT/
├── anquar-core/
└── anquar/
```

```bash
bun install
bun run dev      # http://localhost:5173
```

`bun install` copies anquar-core into `node_modules` rather than linking it,
and Vite pre-bundles that copy into `node_modules/.vite`. After changing
anquar-core, run `bun install` and start with `bun run dev --force`, or the app
keeps running the old core.

No environment variables and no `.env`. The Gemini key is entered in the app
(Settings tab) and lives in `localStorage` under `anquar_api_key`, alongside
`anquar_model` and the daily goal, `anquar_goal`. The Reading Pulse keeps its
small bookkeeping there too: `anquar_last_read_at` (for sessions),
`anquar_moments` and `anquar_pulse_stepped` (what has been celebrated today).

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

**Import** — the Feed and Library tabs' + buttons go through the queue in
`src/lib/imports.ts` and the sheet in `ImportSheet`. Books import one at a time, each in its own
`src/workers/epub.worker.ts`, which `parseEpub` always shuts down afterwards. The
worker judges the file by its bytes, not its name (`import-check.ts`: not a zip,
DRM, damaged, unreadable), then calls `parseEpubFromZip` from anquar-core, and
moves the image bytes to the page rather than copying them. A book whose title
and author match one in the library is held until you choose Open it or Add a
copy. Chapters come back as flat `Block[]`, without the book's apparatus —
cover, title and copyright pages, contents, praise, notes and index — and with
dedications, epigraphs and prefaces marked `frontMatter`. `libraryVersion`
ticks when a book lands, and the Feed and Library tabs load again on it.


**Feed** — `src/components/Feed.tsx`. CSS scroll-snap over cards that
anquar-core's `paginate` lays out to fill one screen each: whole paragraphs
where they fit, a paragraph split at a sentence where a card would otherwise
be mostly empty, headings kept with what they open. A card is an *anquar*, the
unit behind the daily goal and reading stats. `LayoutProbe`, a hidden card in
the reader's type, measures how much a card holds (`src/lib/card-layout.ts`)
and re-measures whenever the screen, type size, line height or margins change;
the book is then paginated again and the reader returned to the card holding
the words they were on. Card ids name a place in the book (`c3-12@480`), which
is how that return, and bookmarks, survive a relayout. `useLazyChapters` loads
three chapters at a time behind an IntersectionObserver sentinel, and `loadUpTo`
pulls forward far enough for a contents jump to land.

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

**Mark and icons** — `src/brand/mark.ts` is the one drawing of the mark: four
lines whose ends run to a point, the core. The header, the icons and the
splash all read it. `bun run icons` (`scripts/icons.ts`, needs rsvg-convert and
ImageMagick) writes every icon, the favicon and the plain iOS startup images
into `public/`; never edit those by hand. The icon's ground is the dark canvas
`#0B1210`, and so are the manifest's `background_color` and `theme_color`:
Android draws its launch splash from them, so launch, splash and app are one
surface.

**Splash** — only in the installed app. Android shows its own splash first
(the maskable icon's mark, centred on the whole screen), so `index.html` paints
the same mark in the same place before the bundle loads; `vite.config.ts`
writes the mark and sizes into it from `src/brand`. `src/splash.ts` takes that
frame over: it holds 0.3 s while Android's splash fades (elsewhere the mark
builds), steps the lines while the app loads, and once `splashReady()` is
called (the Feed tab after `listBooks`, the reader once its book is loaded)
lands the mark on the header's `[data-splash-land]` while
`[data-splash-rise]` and `[data-splash-word]` come in and `[data-splash-slide]`
(the nav and the + button) slides up from below the screen. `SPLASH_CANVAS_DP` in
`mark.ts` was measured on a Nothing A059; re-measure on another phone before
trusting the hand-over there. The design and its reasoning are in
`design/icon-splash.html`.

**Reading Pulse** — `useReadingTracker` times the card on screen while the app
is visible. A card counts once it has been there for its words at 600 wpm,
once per card per day, and its time counts up to its words at 150 wpm. Days end
at 4 a.m. (`dayKey`). `pulseOf` turns the `reading` rows into the card: 5
anquars keep the streak, seven reading days bank a rest day (two at most) that
a missed day spends, and a rest day holds the streak without adding to it.
`ReadingPulse` draws today as `MarkMeter`, the mark filled a quarter of the
goal per line, and tapping it continues your book. `PulseMoment` is the pill
the reader drops when the goal closes, a best day is beaten or the streak is
kept, each once a day.

## Testing

`bun run test` runs Vitest (happy-dom). The reading rules are pure functions in
`src/lib/reading.ts` with their tests beside them, in `reading.test.ts`: the
4 a.m. day, what counts as an anquar, the streak and rest days, the card's
line and which moment to show. Change a rule there, test first.

## PR / Commit

- Commit messages must be concise, describing what changed and why in present tense.
- Use semantic prefixes: `feat:`, `fix:`, `chore:`, `refactor:`.
- No `Co-authored-by:` or attribution footers.
- Run `bun run check` before committing.
- Keep commits atomic — one logical change per commit.
- **Never commit without explicit user approval.** Wait for confirmation before committing anything.

## Safety

<!-- TODO -->
