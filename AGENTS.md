# Anquar

Guilt-free doomscrolling — a Solid.js PWA that turns books into a TikTok-style vertical scroll feed.

## Setup

```bash
bun install
bun run dev      # http://localhost:5173
```

The book parser and paginator is **`anquar-core`**, published to npm from its
own repo (`../anquar-core`). An engine change ships as a new version: test it
there (`bun run src/test.ts --epub`), bump its `version`, run `npm publish`
(which builds `dist/` first, and npm asks you to confirm in the browser), then
`bun add anquar-core@<version>` here.

To run the app on an unpublished engine change, link the repo:

```bash
cd ../anquar-core && bun link && bun run build
cd ../anquar && bun link anquar-core
```

The app then reads `../anquar-core/dist`, so rebuild it after each change.
Linking leaves `package.json` and `bun.lock` alone, and a plain `bun install`
keeps the link; `rm node_modules/anquar-core && bun install` goes back to the
npm version.

No environment variables and no `.env`. The Gemini key is entered in the app
(Settings tab) and lives in `localStorage` under `anquar_api_key`, alongside
`anquar_model`, the daily goal, `anquar_goal`, and how much the reader's rail
shows between taps, `anquar_rail` (one setting for every book), as is the
reader's brightness, `anquar_brightness`. The Reading Pulse keeps its
small bookkeeping there too: `anquar_last_read_at` (for sessions),
`anquar_moments` and `anquar_pulse_stepped` (what has been celebrated today).

## Commands

<!-- TODO -->

## Code Style

<!-- TODO -->

## Architecture

Entirely client-side: no server, no telemetry, no build-time content. The only
request that ever leaves the device is an explicit Explain call; a cover
search only opens Google in the browser.

**Stack** — Solid.js, Vite, Tailwind v4, `vite-plugin-pwa`.

**Routing** — `src/index.tsx` mounts two routes, both rendering `App`: `/` for
the tabs (Feed, Library, Saved, Settings, switched by signal rather than URL)
and `/book/:id` for the reader.

**Import** — every way in (the Feed tab's +, the Library tab's +, and books
shared to Anquar from other apps) goes through the queue in `src/lib/imports.ts`
and the sheet in `ImportSheet`. Books import one at a time, each in its own
`src/workers/epub.worker.ts`, which `parseEpub` always shuts down afterwards. The
worker judges the file by its bytes, not its name (`import-check.ts`: not a zip,
DRM, damaged, unreadable), then calls `parseEpubFromZip` from anquar-core, and
moves the image bytes to the page rather than copying them. A book whose title
and author match one in the library is held until you choose Open it or Add a
copy. Chapters come back as flat `Block[]`, without the book's apparatus —
cover, title and copyright pages, contents, praise, notes and index — and with
dedications, epigraphs and prefaces marked `frontMatter`. `libraryVersion`
ticks when a book lands, and the Feed and Library tabs load again on it.

**Share target** — the manifest's `share_target` makes Anquar a target for
EPUBs in Android's share sheet. `public/share-target.js`, imported into the
generated service worker, takes the post, leaves the files in the
`anquar-shared` cache and redirects to `/?shared`, where `importShared` hands
them to the queue. An installed app only picks up a change to the share target
when Chrome rebuilds it, which can take a day; reinstalling is immediate.

**Storage** — Dexie over IndexedDB in `src/lib/db.ts`, database `anquar`,
schema v2. Tables: `books`, `chapters`, `progress`, `bookmarks`,
`readerSettings`, `reading`, `images`. Image bytes are split into `images`
so chapter JSON stays small; `saveBook` strips them with a replacer. `progress`
keeps the id of the card you're on, and the reader opens at it.
`reading` has one row per book per reading day; deleting a book keeps its rows,
because the streak belongs to you, not the book.

**Library file** — Settings → Data exports every table, the covers and the
pictures as one zip (`src/lib/library-file.ts`, format `anquar-library` v1),
with the `anquar_*` settings but never the Gemini key, so a library moves to
another phone or origin without its EPUBs. Import adds to the library instead
of replacing it: the place read last wins, a day read on both phones counts
each card once, and saves already there are skipped, so importing a file twice
changes nothing. A file from a newer format is refused, not guessed at. Clear
library (`eraseLibrary`) is a true reset of what was read: books, places,
saves, reading history and the Pulse's keys all go, after a sheet asks; the
reader defaults, the goal, the theme and the Gemini key stay.

**Feed** — `src/components/Feed.tsx`. CSS scroll-snap over cards that
anquar-core's `paginate` lays out to fill one screen each: whole paragraphs
where they fit, a paragraph split at a sentence where a card would otherwise
be mostly empty, headings kept with what they open. A card is an *anquar*, the
unit behind the daily goal and reading stats. `LayoutProbe`, a hidden card in
the reader's type, measures how much a card holds (`src/lib/card-layout.ts`)
and re-measures whenever the screen, type size, line height or margins change;
the book is then paginated again and the reader returned to the card holding
the words they were on. Card ids name a place in the book (`c3-12@480`), which
is how that return, and bookmarks, survive a relayout. A book opens at your
chapter rather than paging everything before it: `useLazyChapters` keeps a run
of chapters around you, loading three more as you near either end, and the
reader puts earlier ones in above you without moving the card on screen. A run
starts after a chapter that doesn't carry into the next (anquar-core's
`carriesIntoNext`; a closing part title does), so `createPager` pages each run
on its own and gets exactly the cards the whole book would. A contents jump
outside the run opens the book there. The card you're on is the scroll offset
over a card's measured height, not `clientHeight`, which on most phones is a
fraction of a pixel short of a `dvh` card and drifts a card over a long book.
Only the cards around you are filled with their text and pictures: the one on
screen, 8 ahead and 4 behind, each kept until it is 12 away. The rest are empty
frames of the same height, so snapping, jumps and keeping your place work as if
every card were built, and a book of long chapters opens without building
hundreds of cards.

**Reader chrome** — `ReaderRail` carries contents, explain, save, share and
settings; each opens a `BottomSheet`. The rail overlays the page rather than
reserving a gutter, so it drops `pointer-events` whenever it is not shown.

**Explain** — what was selected (or the card, with nothing selected) is the
context, and `ExplainSheet` sets each of its words as a chip
(`explain-words.ts`). All start on; the first tap picks one word and drops the
rest, later taps add or remove one, and Explain asks what those words mean in
that context, or what all of it says. One word selected is asked about at once,
with the card as context. `explain.ts` streams the answer from Gemini, a gist
line and then its detail, and the sheet sets it in Newsreader word by word.

**Sharing** — Share sends an image of the passage with the passage as text
and `— Title, Author` on the line below. `src/lib/share-card.ts` draws the
image on the phone (option B1 of `design/share-card.html`: the cover sharp and
darkened as a frame, and inset from it a frosted pane of the same cover holding
the passage, with the cover, title and author at the foot) in Newsreader, which
ships in `src/assets/fonts` (OFL) and is precached.

**Transitions** — screen changes go through `src/lib/transitions.ts`. A
book's cover grows into the reader and the reader shrinks back into it on the
View Transitions API, with the motion in `index.css` under `data-transition`.
Tabs fade through in the page itself (`[data-tab-content]`), because a view
transition would show the glass tab bar as a snapshot, its blur a hard
rectangle; for the same reason nothing in the bar has a view-transition name,
which would also stop its blur seeing the page. A cover takes part only if it carries `data-cover` (the book's
id), which `BookCover` passes through. Opening waits briefly for the reader's
`readerLanded()`, so the cover grows into your page rather than an empty one.
Back out of the reader is caught by a `popstate` listener that `index.tsx` adds
before the router starts, and replayed to the router once the reader has been
captured; added after the router, back stops animating. Without the API, or
with reduced motion, screens change at once.

**Reader settings** — `ReaderSettingsProvider` holds them in context, persisted
per book with a `"global"` row as the fallback for a book opened for the first
time. The rail's visibility is the exception: one setting for every book,
kept in `anquar_rail`.

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
