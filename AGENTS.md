# anquar

Guilt-free bookscrolling: a Solid.js PWA that turns books into a vertical feed,
with its landing page on the same origin.

## Setup

```bash
bun install
bun run dev      # landing at http://localhost:5173, the app at /app/
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

No `.env`; the only environment variable is `VAPID_PRIVATE_KEY`, set on Netlify for the reminder function (see
Reminder). The Gemini key is entered in the app
(Settings tab) and lives in `localStorage` under `anquar_api_key`, alongside
`anquar_model`, the daily goal, `anquar_goal`, and how much the reader's rail
shows between taps, `anquar_rail` (one setting for every book), as is the
reader's brightness, `anquar_brightness`. The Reading Pulse keeps its
small bookkeeping there too: `anquar_last_read_at` (for sessions),
`anquar_moments` and `anquar_pulse_stepped` (what has been celebrated today).
`anquar_reminder` is the daily reminder's time of day and `anquar_reminder_sync` what the server was last
told of it. `anquar_install_later` is when the install card was last put off,
`anquar_version` the release whose notes were last seen on this phone, and
`anquar_onboarded` that onboarding has been seen or skipped.

## Commands

<!-- TODO -->

## Code Style

<!-- TODO -->

## Architecture

Client-side, with one small server for the daily reminder (see Reminder), and no build-time content. The only
request that carries anything read is an explicit Explain call; a cover search only opens
Google in the browser. Both pages load Cloudflare Web Analytics' beacon (inline
in `index.html` and `app/index.html`), but only on `anquar.netlify.app`, so dev
and preview never count. It counts page views and route changes without
cookies, and a book's route holds only its random id, never its title. The
landing page's privacy section says this, so keep the two in step.

**Stack** — Solid.js, Vite, Tailwind v4, `vite-plugin-pwa`.

**One origin, two pages** — Vite builds two pages: the landing page at `/`
(`index.html`) and the app at `/app/` (`app/index.html`). The manifest, the
service worker and its precache are scoped to `/app/`, so the landing page is
never installed or cached as the app. `appRoutes()` in `vite.config.ts` serves
`/app/...` as the app in dev and preview, as `netlify.toml` does in production.

**Routing** — `src/index.tsx` mounts two routes, both rendering `App`: `/app/`
for the tabs (Feed, Library, Saved, Settings, switched by signal rather than
URL) and `/app/book/:id` for the reader. The paths live in `src/lib/routes.ts`;
they are written out rather than set as the router's `base`, which gives `/app`
without the slash, outside the manifest's scope.

**Wide screens** — under 720px the app is the phone's, unchanged. `tablet:` (720px) and `desktop:` (1080px) are
Tailwind breakpoints named in `index.css`; `lib/layout.ts` has `isTablet` for code that must choose what to render.
From tablet the bottom bar gives way to `Sidebar` (an icon rail, opening into labels and the update or install
prompt from desktop; the tabs come from `lib/tabs.ts`, their icons from `tab-icons.ts`). The header then names the
tab, and a tab's own controls reach its right end through `HeaderTools` (the Library's search); `page-column`
centres a tab. From desktop the Feed is two columns, with the Pulse pinned in the second. `BottomSheet` and
`ImportSheet` take their place from `lib/sheet-placement.ts`: a bottom sheet on a phone, a centred dialog from tablet,
and for the reader's four sheets (`panel`) a right-hand panel, beside which the page's column slides left from 1280px
(`data-panel`, `.reader-column`). Keys: `lib/keys.ts` says when a key is the page's, `shell-keys.ts` opens tabs (1–4)
and the search (/), `reader-keys.ts` pages and drives the rail (its map is tested), and `useMouseActivity` shows the
rail as a mouse moves, since a mouse's tap does nothing. `drop-books.ts` takes an EPUB dropped anywhere on the
window into the import queue. Not done: a desktop card holds about twice a phone's words, so what an anquar is
there is open, and picking text still wants a mouse drag.

**Landing** — `index.html` is the page's markup and `src/landing` its scripts
and styles, with no framework. Its phones are built from the app's own parts:
the Feed tab's Reading Pulse runs the real `pulseOf`, and the reader pages the
opening of Moby-Dick with anquar-core in a probe of the reader's type, so the
cards are the ones the app would cut. Icons are a Phosphor sprite in
`public/landing/icons.svg`. Its theme toggle writes the app's `theme` key, so
both pages follow one choice.

**Theme and type** — `src/theme/tokens.css` holds every colour once, as
`light-dark()` pairs, with `data-theme` forcing one side; the app's Tailwind
`@theme` and the landing page both read it. `src/theme/fonts.css` self-hosts
Hanken Grotesk (the interface) and Source Serif 4 (the books, Explain and the
share card) from `src/assets/fonts`; `pageStyle` sets the reader's cards and
`LayoutProbe` in the book face, so a card is measured in the type it's read
in. The reader's five
themes are data in `src/lib/reader-themes.ts`, shared with the landing reader.

**Add** — the + on the nav bar and the Library's empty state open `AddSheet`
(`src/lib/add.ts`): Add from files, which closes the sheet and opens the
picker; Find a book, a plain button to the author's Telegram channel
(`FIND_URL`), which posts where to get EPUBs and is opened outside the app; and
Start with Meditations while it isn't in the library. Back from the channel
after 10 seconds to an hour, `visibilitychange` raises the sheet with a line
pointing at Downloads. The app names no site itself.

**Import** — every way in (the Add sheet, and books
shared to anquar from other apps) goes through the queue in `src/lib/imports.ts`
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

**Share target** — the manifest's `share_target` makes anquar a target for
EPUBs in Android's share sheet. `public/share-target.js`, imported into the
generated service worker, takes the post to `/app/share-target`, leaves the files in the
`anquar-shared` cache and redirects to `/app/?shared`, where `importShared` hands
them to the queue. An installed app only picks up a change to the share target
when Chrome rebuilds it, which can take a day; reinstalling is immediate.

**Install** — `src/lib/install.ts`, imported first thing in `src/index.tsx`,
catches Chrome's `beforeinstallprompt` (which also keeps Chrome's mini-infobar
away) and holds it. While it's held and the app isn't installed, `InstallCard`
sits at the top of the Feed tab, and Settings has an App section with the same
button; "Not now" puts the card off for two weeks, but not the Settings row.
Safari has no such event, so an iPhone never sees either.

**Onboarding** — `Onboarding`, loaded lazily by the Feed tab, shows once: when
the library is empty and `anquar_onboarded` isn't set. A library with books
sets it without showing, as does arriving through `?shared` or `?continue`
(`src/lib/onboarding.ts`). Three pages snap like the feed (what anquar is, the
daily goal, which writes `anquar_goal`, and a first book) over one SVG stage
scrubbed by the scroll position: the mark opens into a page of text, folds back
as the goal's meter, and grows into three covers, while a pill down the right
edge follows the page. The splash lands on the stage's mark
(`[data-splash-land="onboarding"]`, which `splash.ts` prefers to the header's),
and finishing folds the books back into the mark and flies it to the header.
The design is option D of `design/onboarding.html`.

**Starter book** — Start with Meditations fetches
`public/books/meditations.epub`, George Long's translation as Project Gutenberg
ships it (#15877), outside the precache so nobody else downloads it.
`shapeStarter` (`src/lib/starter.ts`) rebuilds Gutenberg's size-cut chapters as
Book I to Book XII without Long's essays, notes, indexes or Gutenberg's pages,
and the book gets a cover drawn like the one in the onboarding fan.

**Updates** — `src/lib/changelog.ts` lists every release, newest first, as a
`major.minor.patch` version, a date, a title and plain notes in a reader's
words; the newest is the app's version, so a release is made by adding one
there, and its tests check the list's order and shape. `vite.config.ts` writes
it to `/app/changelog.json`, outside the precache. A deploy arrives as a waiting
service worker (`src/lib/update.ts`, `registerType: "prompt"`), looked for on
launch and, once an hour at most, when the app comes back on screen. It fetches
`changelog.json` to see what the waiting version brings, and `UpdateCard` takes
the install card's place on the Feed tab with that release's title and one
button, Update, so nothing reloads under a book. After that reload the What's
new sheet (`ChangelogSheet`) opens once the splash has landed, or a toast says
it updated when the release had no notes. An update taken by closing the app
shows the card as "anquar updated" until its notes are opened. The sheet leads
with the releases not seen before it opened, marked New, and folds the rest
under Earlier; Settings → App opens it any time. Someone new starts with
nothing to catch up on.

**Storage** — Dexie over IndexedDB in `src/lib/db.ts`, database `anquar`,
schema v2. Tables: `books`, `chapters`, `progress`, `bookmarks`,
`readerSettings`, `reading`, `images`. Image bytes are split into `images`
so chapter JSON stays small; `saveBook` strips them with a replacer. `progress`
keeps the id of the card you're on, and the reader opens at it.
`reading` has one row per book per reading day; deleting a book keeps its rows,
because the streak belongs to you, not the book.

**Library file** — Settings → Data exports every table, the covers and the
pictures as one zip (`src/lib/library-file.ts`, format `anquar-library` v1),
with the `anquar_*` settings but never the Gemini key or `anquar_version`, so a
library moves to another phone or origin without its EPUBs. Import adds to the
library instead of replacing it: the place read last wins, a day read on both
phones counts each card once, and saves already there are skipped, so importing
a file twice changes nothing. A file from a newer format is refused, not
guessed at. Clear library (`eraseLibrary`) is a true reset of what was read:
books, places, saves, reading history and the Pulse's keys all go, after a
sheet asks; the reader defaults, the goal, the theme and the Gemini key stay.

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

**Search** — `BookSearch`, at the top of the Contents sheet, searches the open book. `src/lib/book-search.ts` reads every chapter
once (`listChapters`, kept for the last book searched) and folds its text into one string, without case, accents
or curly quotes, so each keystroke is one `indexOf` over the whole book. A match keeps its block's id and offset as
a card id (`c5-195@189`, or `c1-4#2` for a list item), which `findCardHolding` takes to the card holding it, as
with saves and your place. The reader jumps there at once and lights every match on that card with the
`search-match` highlight until you read on. `/` and Ctrl+F open it; the browser's own find can't see the cards
that aren't built. Its tests run the real Meditations file.

**Reader chrome** — `ReaderRail` carries contents, explain, save, share, the
lamp and settings for the card on screen; each opens a `BottomSheet` but the
lamp (`BrightnessLamp`), which dims the page under a dark layer, since the web
can't set the screen's brightness: press it and slide, or tap it to leave its
pill open. The rail overlays the page rather than reserving a gutter, so it
drops `pointer-events` whenever it is not shown.

**Picking text** — the reader's text is never selectable, so Chrome's handles
and menu never appear; `TextPick` is the reader's own selection. Holding a word
for 380 ms picks it, and sliding on takes more a word at a time, with
`touchmove` cancelled so the feed holds still. `PageText` (`src/lib/text-pick.ts`)
reads one card's text, finds the word under a finger with
`caretPositionFromPoint` and `Intl.Segmenter`, and maps a pick back to a
`Range`, which the Custom Highlight API draws without touching the card's
nodes. One word is picked bare; a passage takes its quotes and punctuation. Two
handles snap to words and can't cross, and lifting the finger opens a pill above
the pick with Explain, Save, Share and Copy. A tap off the pick, another card, a
new layout or a sheet lets it go. A pick's events never reach the feed's own tap,
so it doesn't toggle the rail or count toward a double-tap save.

**Explain** — what was picked (or the card, with nothing picked) is the
context, and `ExplainSheet` sets each of its words as a chip
(`explain-words.ts`). All start on; the first tap picks one word and drops the
rest, later taps add or remove one, and Explain asks what those words mean in
that context, or what all of it says. One word picked is asked about at once,
with the card as context. `explain.ts` streams the answer from Gemini, a gist
line and then its detail, and the sheet sets it in Source Serif 4 word by word.
A speaker beside the asked word says it, as a dictionary's does, in a voice
that lives on the phone (`speech.ts`); with no such voice it isn't shown, since
a network voice would send the word away.

**Sharing** — Share sends an image of the passage with the passage as text
and `— Title, Author` on the line below. `src/lib/share-card.ts` draws the
image on the phone (option B1 of `design/share-card.html`: the cover sharp and
darkened as a frame, and inset from it a frosted pane of the same cover holding
the passage, with the cover, title and author at the foot) in Source Serif 4, which
ships in `src/assets/fonts` (OFL) and is precached.
The image opens in the Share sheet (`ShareSheet`) before it goes anywhere:
Share hands the JPEG and the text to the phone's own share sheet, shown only
where the browser can share files (not Chrome on Linux, not Firefox); Copy
image puts it on the clipboard as a PNG, made after the tap and handed over as
a promise, since the clipboard takes no JPEG; Save image downloads it; Copy text
copies the passage with its book. `preparePassage` (`share-passage.ts`) is that
path for the reader and for Saved, where holding a save opens `PassageSheet`:
Share, or Delete on a second tap. A whole card is saved as its first 280
characters, so `savedQuote` ends it on its last whole sentence, in the list and
when shared.

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

**Link previews** — the picture a chat or timeline shows for anquar's address.
`bun run og` (`scripts/og.ts`, needs chromium and ffmpeg) draws the landing
hero as a poster, the headline over faint Moby-Dick, from `mark.ts`,
`tokens.css`, the shipped fonts and the landing's sample text, and writes five
JPEGs into `public/og/`: `anquar-og` (1200×630, which Facebook, LinkedIn,
Slack, Discord, iMessage, WhatsApp and Telegram read as `og:image`) and
`anquar-x` (2:1, `twitter:image`) are named by the tags on both pages; square,
pin and story are for posting by hand. Each stays under 300 KB, which the
script checks, since WhatsApp swaps a heavier preview for a thumbnail. `og/**`
is left out of the precache, so an installed app never downloads them. Never
edit them by hand; the design and its two rejected directions are in
`design/og.html`.

**Splash** — only in the installed app. Android shows its own splash first
(the maskable icon's mark, centred on the whole screen), so `app/index.html` paints
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

**Reminder** — Settings → Reading has a Daily reminder switch. Turning it on asks for notifications, subscribes
to Web Push and sends `/api/reminder` the subscription, the time of day and the phone's time zone
(`src/lib/reminder.ts`). The server is two Netlify functions in `netlify/functions`, glue over
`src/server/reminders.ts`: `reminder` keeps or drops a phone's row in Netlify Blobs, and `send-reminders` runs every
15 minutes and sends what is due with `web-push`, dropping a phone whose push address has expired. A row holds the
push address, the time, the zone, whether today's goal is closed and the day last reminded, never what was read.
`syncReminder(closed)` is called wherever the Pulse is worked out (the Feed tab, the reader after each counted
card) and tells the server the goal is closed, which keeps that day quiet; it only sends when that has changed.
`dueDay` (`src/lib/reminder-schedule.ts`, tested) decides when: within 90 minutes after the chosen time, once per
reading day, never on a closed day. The words come from the server and change by the day. `public/push.js`, imported
into the generated service worker, shows them (not while the app is on screen, which Chrome allows) and a tap opens
the app. The public VAPID key is in `reminder-schedule.ts`; the private half is `VAPID_PRIVATE_KEY` on Netlify, and
scheduled functions run only on production deploys. Turning it off drops the subscription, which is what stops it;
telling the server just tidies up. Only the push services browsers use are accepted as addresses
(`isPushEndpoint`). An iPhone can be reminded only once anquar is on its Home Screen; `bun run dev` has no
service worker or functions, so the switch can't turn on there; a built copy needs a stand-in for `/api/reminder`
(call `handleReminder` and `sendDue` from `src/server/reminders.ts`), or use the deployed site. `public/icons/badge-96x96.png` is the white mark
Android draws in the status bar; `bun run icons` writes it.

## Testing

`bun run test` runs Vitest (happy-dom). The reading rules are pure functions in
`src/lib/reading.ts` with their tests beside them, in `reading.test.ts`: the
4 a.m. day, what counts as an anquar, the streak and rest days, the card's
line and which moment to show. Change a rule there, test first.
`changelog.test.ts` checks that releases run newest first with valid versions
and dates, and `starter.test.ts` runs the real Meditations file, so a note left
in or a section of Marcus's taken out fails there.

## PR / Commit

- Commit messages must be concise, describing what changed and why in present tense.
- Use semantic prefixes: `feat:`, `fix:`, `chore:`, `refactor:`.
- No `Co-authored-by:` or attribution footers.
- Run `bun run check` before committing.
- A change a reader would notice adds a note to the newest release in
  `src/lib/changelog.ts`, or a new release if the last one has shipped.
- Keep commits atomic — one logical change per commit.
- **Never commit without explicit user approval.** Wait for confirmation before committing anything.

## Safety

<!-- TODO -->
