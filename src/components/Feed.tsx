import { useNavigate, useParams, useSearchParams } from "@solidjs/router";
import {
	BLOCK_GAP_LINES,
	type Block,
	type Card,
	type CardLayout,
	HEADING_SCALE,
	type HeadingBlock,
	type ImageBlock,
	ITEM_GAP_LINES,
	type ListBlock,
	PHONE_LAYOUT,
	type StyleRun,
	type TextBlock,
} from "anquar-core";
import { BookmarkSimple, CaretLeft } from "phosphor-solid";
import {
	batch,
	createEffect,
	createMemo,
	createResource,
	createSignal,
	For,
	Match,
	on,
	onCleanup,
	onMount,
	Show,
	Switch,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import toast from "solid-toast";
import { matchRanges, type SearchHit } from "../lib/book-search.ts";
import { brightness, cycleBrightness } from "../lib/brightness.ts";
import {
	createPager,
	findCardHolding,
	LAYOUT_SAMPLE,
	readLayout,
	reuseCards,
} from "../lib/card-layout.ts";
import { chapterLabel } from "../lib/chapters.ts";
import { coverUrl } from "../lib/covers.ts";
import {
	addBookmark,
	getBookMeta,
	getBookmark,
	getProgress,
	imageKey,
	listBookmarks,
	listBooks,
	listReading,
	removeBookmark,
	saveProgress,
} from "../lib/db.ts";
import { flourish, tick } from "../lib/haptics.ts";
import { imageUrl } from "../lib/images.ts";
import { rangeOf } from "../lib/passage-range.ts";
import { useReaderKeys } from "../lib/reader-keys.ts";
import {
	getAccentColors,
	type ReaderSettings,
	useReaderSettings,
} from "../lib/reader-settings.tsx";
import {
	dayKey,
	type Moment,
	markMomentShown,
	momentFor,
	momentsShown,
	pulseOf,
	readingGoal,
} from "../lib/reading.ts";
import { syncReminder } from "../lib/reminder.ts";
import { HOME } from "../lib/routes";
import { SNIPPET_CHARS } from "../lib/saved-quote.ts";
import { preparePassage } from "../lib/share-passage.ts";
import { leaveBook, readerLanded } from "../lib/transitions.ts";
import { useLazyChapters } from "../lib/useLazyChapters.ts";
import { useMouseActivity } from "../lib/useMouseActivity.ts";
import { useReadingTracker } from "../lib/useReadingTracker.ts";
import { useScreenAwake } from "../lib/useScreenAwake.ts";
import { useTikTokScroll } from "../lib/useTikTokScroll.ts";
import { splashReady } from "../splash.ts";
import BottomSheet from "./BottomSheet.tsx";
import ContentsSheet from "./ContentsSheet.tsx";
import CoverCard from "./CoverCard.tsx";
import ExplainSheet from "./ExplainSheet.tsx";
import PulseMoment from "./PulseMoment.tsx";
import ReaderRail from "./ReaderRail.tsx";
import ReaderSettingsPanel from "./ReaderSettingsPanel.tsx";
import ShareSheet from "./ShareSheet.tsx";
import TextPick from "./TextPick.tsx";

interface BookMeta {
	author: string;
	coverUrl?: string;
	id: string;
	title: string;
	totalChapters: number;
}

function pageStyle(
	settings: ReaderSettings,
	colors: { bgColor: string; textColor: string },
) {
	return {
		background: colors.bgColor,
		color: colors.textColor,
		"font-family": "var(--font-read)",
		"font-size": `${(settings.fontSize / 100) * 1.15}rem`,
		"line-height": String(settings.lineHeight),
		"padding-inline": `${settings.hPadding}rem`,
	};
}

function StyledRuns(props: { runs: StyleRun[] }) {
	return (
		<For each={props.runs}>
			{(run) => (
				<Switch fallback={run.text}>
					<Match when={run.bold && run.italic}>
						<strong>
							<em>{run.text}</em>
						</strong>
					</Match>
					<Match when={run.bold}>
						<strong>{run.text}</strong>
					</Match>
					<Match when={run.italic}>
						<em>{run.text}</em>
					</Match>
				</Switch>
			)}
		</For>
	);
}

function ImageCard(props: { block: ImageBlock; bookId: string }) {
	const [url] = createResource(
		() => imageKey(props.bookId, props.block.id),
		imageUrl,
	);

	return (
		<div class="flex min-h-0 w-full flex-1 items-center justify-center">
			<Show
				fallback={
					<p class="text-center text-[0.8em] opacity-50">
						{props.block.alt || "Image unavailable"}
					</p>
				}
				when={url()}
			>
				<img
					alt={props.block.alt}
					class="max-h-full max-w-full rounded-xl object-contain"
					src={url()}
				/>
			</Show>
		</div>
	);
}

function ListCard(props: { block: ListBlock }) {
	const { settings } = useReaderSettings();

	return (
		<Dynamic
			class="flex w-full flex-col"
			component={props.block.ordered ? "ol" : "ul"}
			style={{ gap: `${ITEM_GAP_LINES * settings().lineHeight}em` }}
		>
			<For each={props.block.items}>
				{(item, i) => (
					<li
						class="flex gap-[0.6em]"
						style={{ "padding-left": `${item.depth * 1.15}em` }}
					>
						<span class="shrink-0 opacity-45 tabular-nums" data-pick-skip>
							{props.block.ordered ? `${(props.block.start ?? 1) + i()}.` : "—"}
						</span>
						<span class="whitespace-pre-line">
							<StyledRuns runs={item.runs} />
						</span>
					</li>
				)}
			</For>
		</Dynamic>
	);
}

const asText = (b: Block) => (b.type === "text" ? b : undefined);
const asHeading = (b: Block) => (b.type === "heading" ? b : undefined);
const asList = (b: Block) => (b.type === "list" ? b : undefined);
const asImage = (b: Block) => (b.type === "image" ? b : undefined);

function Paragraph(props: { block: TextBlock }) {
	return (
		<p class="w-full whitespace-pre-line">
			<StyledRuns runs={props.block.runs} />
		</p>
	);
}

function Heading(props: { block: HeadingBlock }) {
	return (
		<h2
			class="w-full text-balance font-semibold tracking-tight"
			classList={{ "text-center": props.block.level <= 2 }}
			style={{
				"font-size": `${HEADING_SCALE[props.block.level]}em`,
				"line-height": "1.25",
			}}
		>
			<StyledRuns runs={props.block.runs} />
		</h2>
	);
}

function BlockView(props: { block: Block; bookId: string }) {
	return (
		<Switch>
			<Match when={asText(props.block)}>
				{(text) => <Paragraph block={text()} />}
			</Match>
			<Match when={asHeading(props.block)}>
				{(heading) => <Heading block={heading()} />}
			</Match>
			<Match when={asList(props.block)}>
				{(list) => <ListCard block={list()} />}
			</Match>
			<Match when={asImage(props.block)}>
				{(image) => <ImageCard block={image()} bookId={props.bookId} />}
			</Match>
			<Match when={props.block.type === "break"}>
				<div
					aria-hidden="true"
					class="w-full select-none text-center opacity-40"
				>
					⁂
				</div>
			</Match>
		</Switch>
	);
}

function CardView(props: { card: Card; bookId: string; filled: boolean }) {
	const { settings, themeColors } = useReaderSettings();

	const blocks = () => props.card.blocks;
	const centred = () =>
		settings().verticalAlign === "center" ||
		blocks().some((b) => b.type === "image") ||
		blocks().every((b) => b.type === "heading");

	return (
		<section
			class="snap-page flex h-dvh flex-col overflow-hidden py-[9dvh]"
			data-card
			style={pageStyle(settings(), themeColors())}
		>
			<Show when={props.filled}>
				<div
					class="reader-column mx-auto flex min-h-0 w-full max-w-prose flex-1 flex-col overflow-y-auto"
					style={{
						gap: `${BLOCK_GAP_LINES * settings().lineHeight}em`,
						"justify-content": centred() ? "safe center" : "flex-start",
					}}
				>
					<For each={blocks()}>
						{(block) => <BlockView block={block} bookId={props.bookId} />}
					</For>
				</div>
			</Show>
		</section>
	);
}

function LayoutProbe(props: { onLayout: (layout: CardLayout) => void }) {
	const { settings, themeColors } = useReaderSettings();
	let page: HTMLElement | undefined;
	let paragraph: HTMLParagraphElement | undefined;
	let line: HTMLSpanElement | undefined;

	onMount(() => {
		const measure = () => {
			if (!page || !paragraph || !line) return;
			const layout = readLayout(page, paragraph, line);
			if (layout) props.onLayout(layout);
		};
		const observer = new ResizeObserver(measure);
		for (const el of [page, paragraph, line]) if (el) observer.observe(el);
		void document.fonts?.ready.then(measure);
		onCleanup(() => observer.disconnect());
	});

	return (
		<section
			aria-hidden="true"
			class="pointer-events-none invisible fixed inset-0 flex h-dvh flex-col overflow-hidden py-[9dvh]"
			ref={page}
			style={pageStyle(settings(), themeColors())}
		>
			<div class="mx-auto w-full max-w-prose">
				<span class="inline-block" ref={line}>
					x
				</span>
				<p class="w-full whitespace-pre-line" ref={paragraph}>
					{LAYOUT_SAMPLE}
				</p>
			</div>
		</section>
	);
}

function StartReadingPill(props: { onClick: () => void }) {
	const { themeColors } = useReaderSettings();

	return (
		<button
			class="-translate-x-1/2 fixed bottom-10 left-1/2 z-40 flex items-center gap-1.5 rounded-full px-4 py-2.5 font-medium text-sm shadow-lg transition-transform active:scale-95"
			onClick={(e) => {
				e.stopPropagation();
				props.onClick();
			}}
			style={{
				background: themeColors().textColor,
				color: themeColors().bgColor,
			}}
			type="button"
		>
			Start reading
			<svg
				class="h-4 w-4"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2.5"
				aria-hidden="true"
			>
				<path d="M12 5v14m0 0-6-6m6 6 6-6" />
			</svg>
		</button>
	);
}

type SheetName = "contents" | "explain" | "settings" | "share";

// Only the cards around you are filled with their text and pictures: the one on screen, FILL_AHEAD after it
// and FILL_BEHIND before, each kept until it is more than KEEP_FILLED away. The rest are empty frames of the
// same height, so snapping, jumps and keeping your place work as if every card were built.
const FILL_AHEAD = 8;
const FILL_BEHIND = 4;
const KEEP_FILLED = 12;

// How long the feed has to be still before chapters can go in above it.
const SCROLL_SETTLE_MS = 150;

// A card is a dynamic viewport tall, which on most phones isn't the whole number of pixels clientHeight
// is; dividing by clientHeight drifts by a card over a long book.
const cardHeight = (feed: HTMLElement) =>
	feed.querySelector(".snap-page")?.getBoundingClientRect().height ||
	feed.clientHeight;

function cardText(blocks: Block[]): string {
	return blocks
		.map((b) => {
			if (b.type === "text" || b.type === "heading") {
				return b.runs.map((r) => r.text).join("");
			}
			if (b.type === "list") {
				return b.items.map((i) => i.runs.map((r) => r.text).join("")).join(" ");
			}
			return b.type === "image" ? (b.alt ?? "") : "";
		})
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}

export default function Feed() {
	const params = useParams();
	const [search] = useSearchParams();
	const navigate = useNavigate();
	const { settings, themeColors } = useReaderSettings();

	const [bookMeta, setBookMeta] = createSignal<BookMeta | null>(null);
	const [metaLoaded, setMetaLoaded] = createSignal(false);

	const {
		chapters,
		allLoaded,
		atStart,
		openAt,
		reach,
		observeSentinel,
		observeTop,
	} = useLazyChapters(() => bookMeta()?.id ?? "");

	const [layout, setLayout] = createSignal<CardLayout>(PHONE_LAYOUT, {
		equals: (a, b) =>
			a.charsPerLine === b.charsPerLine && a.linesPerCard === b.linesPerCard,
	});

	const page = createPager();
	const cards = createMemo<Card[]>(
		(prev) => reuseCards(page(chapters(), layout()), prev),
		[],
	);
	// The cover leads the book only once its first chapter is loaded.
	const coverPages = () => (atStart() ? 1 : 0);

	const [container, setContainer] = createSignal<HTMLDivElement>();
	const scroller = useTikTokScroll(container);
	useScreenAwake(container);

	const bodyStart = createMemo(() => {
		if (!atStart()) return 0;
		const frontMatter = new Set(
			chapters()
				.filter((ch) => ch.frontMatter)
				.map((ch) => ch.index),
		);
		if (frontMatter.size === 0) return 0;
		const i = cards().findIndex((card) => !frontMatter.has(card.chapterIndex));
		return i < 0 ? 0 : i + coverPages();
	});

	const [position, setPosition] = createSignal(0);
	const [shown, setShown] = createSignal(false);
	const [sheet, setSheet] = createSignal<SheetName | null>(null);
	const [explaining, setExplaining] = createSignal({
		passage: "",
		selection: "",
	});
	const [sharing, setSharing] = createSignal<{
		image: Blob;
		name: string;
		text: string;
	}>();
	const [bookmarks, setBookmarks] = createSignal<
		Awaited<ReturnType<typeof listBookmarks>>
	>([]);

	const inFrontMatter = () => bodyStart() > 0 && position() < bodyStart();

	const cardIndex = () => position() - coverPages();
	const currentCard = createMemo(() => cards()[cardIndex()]);

	const filledRange = createMemo<[number, number]>(
		([from, to]) => {
			const at = cardIndex();
			const near: [number, number] = [at - FILL_BEHIND, at + FILL_AHEAD];
			if (to < near[0] || from > near[1]) return near;
			return [
				Math.max(Math.min(from, near[0]), at - KEEP_FILLED),
				Math.min(Math.max(to, near[1]), at + KEEP_FILLED),
			];
		},
		[0, -1],
		{ equals: (a, b) => a[0] === b[0] && a[1] === b[1] },
	);
	const filled = (index: number) =>
		index >= filledRange()[0] && index <= filledRange()[1];

	const [moment, setMoment] = createSignal<Moment>();
	async function celebrate() {
		const today = dayKey();
		const pulse = pulseOf(await listReading(), today);
		void syncReminder(pulse.today >= readingGoal());
		if (moment()) return;
		const next = momentFor(pulse, readingGoal(), momentsShown(today));
		if (!next) return;
		markMomentShown(today, next.kind);
		setMoment(next);
		flourish();
	}

	useReadingTracker({
		bookId: () => bookMeta()?.id,
		card: currentCard,
		onCounted: () => void celebrate(),
	});

	let lastTap = 0;
	let downX = 0;
	let downY = 0;
	let bloomEl: HTMLDivElement | undefined;

	const reduceMotion = () =>
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// A tap shows the controls on a phone; with a mouse they follow it.
	const mouseNear = useMouseActivity();
	const railShown = () => shown() || mouseNear();

	const chapterSpans = createMemo(() => {
		const map = new Map<number, { count: number; first: number }>();
		cards().forEach((card, i) => {
			const span = map.get(card.chapterIndex);
			if (span) span.count += 1;
			else map.set(card.chapterIndex, { count: 1, first: i });
		});
		return map;
	});

	const currentChapter = () => currentCard()?.chapterIndex ?? 0;

	const progress = createMemo(() => {
		const total = bookMeta()?.totalChapters ?? 0;
		if (total === 0) return 0;
		if (allLoaded() && cardIndex() === cards().length - 1) return 1;
		const span = chapterSpans().get(currentChapter());
		const within =
			span && span.count > 1 ? (cardIndex() - span.first) / span.count : 0;
		return Math.min(1, Math.max(0, (currentChapter() + within) / total));
	});

	const savedCardIndexes = createMemo(() => {
		const list = cards();
		const loaded = chapters();
		const from = loaded[0]?.index ?? 0;
		const to = from + loaded.length;
		return bookmarks().map((b) => {
			if (b.chapterIndex < from || b.chapterIndex >= to) return -1;
			if (b.cardId) return findCardHolding(list, b.cardId);
			return atStart() ? (b.cardIndex ?? -1) : -1;
		});
	});

	// Whether the card itself is saved; passages picked from it are bookmarks of their own.
	const savedHere = () =>
		bookmarks().some(
			(b, i) => !b.passage && savedCardIndexes()[i] === cardIndex(),
		);

	const chromeOpacity = () => {
		if (moment()) return 0;
		if (railShown() || settings().railRest === "always") return 1;
		return settings().railRest === "hidden" ? 0 : 0.3;
	};

	async function refreshBookmarks() {
		const id = bookMeta()?.id;
		if (id) setBookmarks(await listBookmarks(id));
	}

	// Whether a passage picked from the card on screen is already saved.
	const passageSaved = (passage: string) =>
		bookmarks().some(
			(b, i) =>
				b.passage &&
				b.textSnippet === passage &&
				savedCardIndexes()[i] === cardIndex(),
		);

	// Saves or unsaves the card, or with a picked passage that passage: the two never undo each other.
	async function toggleSave(picked = "") {
		const meta = bookMeta();
		const card = currentCard();
		if (!meta || !card) return;

		const passage = picked.trim();
		const existing = bookmarks().find(
			(b, i) =>
				savedCardIndexes()[i] === cardIndex() &&
				(passage ? b.passage && b.textSnippet === passage : !b.passage),
		);
		tick();
		if (existing?.id !== undefined) {
			await removeBookmark(existing.id);
			toast.success(passage ? "Passage removed" : "Removed from shelf");
		} else {
			await addBookmark({
				bookId: meta.id,
				cardId: card.id,
				cardIndex: cardIndex(),
				chapterIndex: card.chapterIndex,
				label: chapterLabel(
					chapters().find((c) => c.index === card.chapterIndex)?.title ?? "",
					card.chapterIndex,
				),
				...(passage
					? { passage: true, textSnippet: passage }
					: { textSnippet: cardText(card.blocks).slice(0, SNIPPET_CHARS) }),
			});
			toast.success(passage ? "Passage saved" : "Saved to your shelf");
		}
		await refreshBookmarks();
	}

	function bloom() {
		if (!bloomEl || reduceMotion()) return;
		bloomEl.classList.remove("save-bloom");
		void bloomEl.offsetWidth;
		bloomEl.classList.add("save-bloom");
	}

	function scrollToCard(index: number, instant = false) {
		const pages = container()?.querySelectorAll<HTMLElement>(".snap-page");
		pages?.[index + coverPages()]?.scrollIntoView({
			behavior: instant || reduceMotion() ? "auto" : "smooth",
			block: "start",
		});
	}

	let anchor: string | undefined;
	let returningTo: number | undefined;
	let returnDeadline: ReturnType<typeof setTimeout> | undefined;
	createEffect(
		on(position, () => {
			const card = currentCard();
			if (!card) return;
			if (returningTo !== undefined) {
				if (cardIndex() !== returningTo) return;
				returningTo = undefined;
			}
			if (!anchor || findCardHolding(cards(), anchor) !== cardIndex())
				anchor = card.id;
		}),
	);
	createEffect(
		on(
			layout,
			() => {
				if (!anchor) return;
				const index = findCardHolding(cards(), anchor);
				if (index < 0) return;
				returningTo = index;
				clearTimeout(returnDeadline);
				returnDeadline = setTimeout(() => {
					returningTo = undefined;
				}, 1000);
				requestAnimationFrame(() => scrollToCard(index, true));
			},
			{ defer: true },
		),
	);
	onCleanup(() => clearTimeout(returnDeadline));

	// Opened from Saved, the book shows the saved card without making it your place: that waits until you
	// read on from it, and the passage's highlight goes when you do.
	let visiting: string | undefined;
	const HIGHLIGHT = "saved-passage";
	function showPassage(card: Element | undefined, passage: string) {
		const range = card && rangeOf(card, passage);
		if (range && "highlights" in CSS)
			CSS.highlights.set(HIGHLIGHT, new Highlight(range));
	}
	onCleanup(() => "highlights" in CSS && CSS.highlights.delete(HIGHLIGHT));

	// The place is the card's id, a place in the book, so a relayout can't move it. The cover isn't a place:
	// scrolling back to it keeps the card you were on.
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let unsaved: (() => void) | undefined;
	const flushPlace = () => {
		clearTimeout(saveTimer);
		unsaved?.();
		unsaved = undefined;
	};
	createEffect(
		on(
			position,
			() => {
				const meta = bookMeta();
				const card = currentCard();
				if (!meta || !card) return;
				if (visiting !== undefined) {
					if (card.id === visiting) return;
					visiting = undefined;
					if ("highlights" in CSS) CSS.highlights.delete(HIGHLIGHT);
				}
				const place = {
					cardId: card.id,
					chapterIndex: card.chapterIndex,
					percent: progress() * 100,
				};
				clearTimeout(saveTimer);
				unsaved = () => void saveProgress(meta.id, place);
				saveTimer = setTimeout(flushPlace, 600);
			},
			{ defer: true },
		),
	);
	onMount(() => {
		const onHide = () => document.hidden && flushPlace();
		document.addEventListener("visibilitychange", onHide);
		onCleanup(() => {
			document.removeEventListener("visibilitychange", onHide);
			flushPlace();
		});
	});

	// The book opens at your chapter and lands on your card in the same task its cards arrive in, so the
	// first thing drawn is your place.
	createEffect(
		on(
			() => bookMeta()?.id,
			async (id) => {
				if (!id) return;
				const bookmark = search.saved
					? await getBookmark(Number(search.saved))
					: undefined;
				const visit = bookmark?.bookId === id ? bookmark : undefined;
				const saved = visit ? undefined : await getProgress(id);
				if (id !== bookMeta()?.id) return;
				await openAt(visit?.chapterIndex ?? saved?.chapterIndex ?? 0);
				if (id !== bookMeta()?.id) return;
				const place = visit?.cardId ?? saved?.cardId;
				const index = place ? findCardHolding(cards(), place) : -1;
				// Before the position moves, which would otherwise save it as your place.
				if (visit) visiting = cards()[index]?.id ?? "";
				if (place && index >= 0) {
					anchor = place;
					scrollToCard(index, true);
					setPosition(index + coverPages());
				}
				if (visit?.passage) {
					const page =
						container()?.querySelectorAll(".snap-page")[index + coverPages()];
					showPassage(page, visit.textSnippet);
				}
				readerLanded();
			},
		),
	);

	// Chapters loaded above you go in while the feed is still, and the feed moves down by what they add, so
	// the card you are on stays where it is. Chrome re-snaps to that card by itself; setting the offset
	// outright, rather than adding to it, holds either way.
	let lastScroll = 0;
	const still = () =>
		new Promise<void>((resolve) => {
			const check = () =>
				performance.now() - lastScroll > SCROLL_SETTLE_MS
					? resolve()
					: setTimeout(check, SCROLL_SETTLE_MS);
			check();
		});
	async function keepPlace(commit: () => void) {
		await still();
		const el = container();
		if (!el) return commit();
		const height = cardHeight(el);
		const at = Math.round(el.scrollTop / height);
		const before = cards().length + coverPages();
		batch(() => {
			commit();
			setPosition(at + cards().length + coverPages() - before);
		});
		el.scrollTop = position() * height;
	}

	async function jumpToChapter(chapterIndex: number) {
		setSheet(null);
		const how = await reach(chapterIndex);
		const i = cards().findIndex((c) =>
			c.blocks.some((b) => b.chapterIndex === chapterIndex),
		);
		if (i >= 0) scrollToCard(i, how === "opened");
	}

	// A match found in the book lands with every match on its card lit, until you read on from it.
	const [query, setQuery] = createSignal("");
	let searchField: HTMLInputElement | undefined;
	const FOUND = "search-match";
	let landing: { cardId: string; arrived: boolean } | undefined;
	const unlight = () => "highlights" in CSS && CSS.highlights.delete(FOUND);
	function light() {
		const page = container()?.querySelectorAll(".snap-page")[position()];
		const ranges = page ? matchRanges(page, query()) : [];
		if (ranges.length > 0 && "highlights" in CSS)
			CSS.highlights.set(FOUND, new Highlight(...ranges));
	}
	createEffect(
		on(
			position,
			() => {
				if (!landing) return;
				if (currentCard()?.id === landing.cardId) {
					landing.arrived = true;
					requestAnimationFrame(light);
				} else if (landing.arrived) {
					landing = undefined;
					unlight();
				}
			},
			{ defer: true },
		),
	);
	onCleanup(unlight);

	function find() {
		setSheet("contents");
		requestAnimationFrame(() => {
			searchField?.focus();
			searchField?.select();
		});
	}

	async function jumpToMatch(hit: SearchHit) {
		setSheet(null);
		unlight();
		await reach(hit.chapterIndex);
		const i = findCardHolding(cards(), hit.place);
		if (i < 0) return;
		landing = { cardId: cards()[i].id, arrived: false };
		if (i === cardIndex()) {
			landing.arrived = true;
			return light();
		}
		// At once, not scrolled through: a match can be hundreds of cards away.
		scrollToCard(i, true);
		setPosition(i + coverPages());
	}

	async function share(picked: string) {
		const meta = bookMeta();
		const card = currentCard();
		if (!meta || !card) return;
		const ready = await preparePassage(
			meta,
			(picked || cardText(card.blocks)).trim(),
		);
		if (!ready) return;
		setSharing(ready);
		setSheet("share");
	}

	function explain(picked: string) {
		const card = currentCard();
		if (!card) return;
		setExplaining({ passage: cardText(card.blocks), selection: picked });
		setSheet("explain");
	}

	function trackPosition(e: Event) {
		lastScroll = performance.now();
		const el = e.currentTarget as HTMLElement;
		const height = cardHeight(el);
		if (height > 0) {
			setPosition(Math.round(el.scrollTop / height));
		}
	}

	function onPointerUp(e: PointerEvent) {
		if (e.pointerType === "mouse") return;
		if ((e.target as HTMLElement | null)?.closest(".rail")) return;
		const wasSwipe =
			Math.abs(e.clientX - downX) > 10 || Math.abs(e.clientY - downY) > 10;
		if (wasSwipe) return;

		const now = Date.now();
		if (now - lastTap < 320) {
			lastTap = 0;
			setShown((v) => !v);
			if (!savedHere()) {
				void toggleSave();
				bloom();
			}
			return;
		}
		lastTap = now;
		setShown((v) => !v);
	}

	const toggleSheet = (name: SheetName) =>
		setSheet((open) => (open === name ? null : name));

	function goBack() {
		const id = bookMeta()?.id;
		if (id) leaveBook(() => navigate(HOME), id);
	}

	useReaderKeys({
		contents: () => toggleSheet("contents"),
		dim: cycleBrightness,
		explain: () => (sheet() === "explain" ? setSheet(null) : explain("")),
		find,
		leave: () => (sheet() ? setSheet(null) : goBack()),
		next: () => scroller.step(1),
		previous: () => scroller.step(-1),
		save: () => void toggleSave(),
		settings: () => toggleSheet("settings"),
	});

	function startReading() {
		const el = container();
		const page = el?.querySelectorAll<HTMLElement>(".snap-page")[bodyStart()];
		page?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	createEffect(() => {
		if (bookMeta()) void refreshBookmarks();
	});

	createEffect(async () => {
		const routeId = params.id;
		try {
			const record = routeId
				? await getBookMeta(routeId)
				: (await listBooks())[0];

			setBookMeta(
				record
					? {
							id: record.id,
							title: record.title,
							author: record.author,
							totalChapters: record.chapterCount,
							coverUrl: coverUrl(record.id, record.coverImage),
						}
					: null,
			);
		} catch (err) {
			console.error("Failed to load book:", err);
		} finally {
			setMetaLoaded(true);
			splashReady();
		}
	});

	return (
		<Show
			fallback={
				<div class="flex h-dvh items-center justify-center">
					<div class="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
				</div>
			}
			when={metaLoaded()}
		>
			<Show
				fallback={
					<div class="flex h-dvh items-center justify-center px-10 text-center text-ink-soft">
						That book is no longer in your library.
					</div>
				}
				when={bookMeta()}
			>
				{(meta) => (
					<>
						<LayoutProbe onLayout={setLayout} />

						<div
							class="snap-container h-dvh overflow-y-auto"
							data-book={meta().id}
							data-panel={sheet() !== null}
							onPointerDown={(e) => {
								downX = e.clientX;
								downY = e.clientY;
							}}
							onPointerUp={onPointerUp}
							onScroll={trackPosition}
							ref={setContainer}
						>
							<Show
								fallback={
									<Show when={chapters().length > 0}>
										<div ref={(el) => observeTop(el, keepPlace)} />
									</Show>
								}
								when={atStart()}
							>
								<CoverCard
									author={meta().author}
									chapterCount={meta().totalChapters}
									coverUrl={meta().coverUrl}
									title={meta().title}
								/>
							</Show>

							<For each={cards()}>
								{(card, i) => (
									<CardView
										bookId={meta().id}
										card={card}
										filled={filled(i())}
									/>
								)}
							</For>

							<Show when={!allLoaded()}>
								<div class="h-16" ref={observeSentinel} />
							</Show>
						</div>

						<button
							aria-label="Back to library"
							class="fixed top-0 left-0 z-40 m-3 flex h-[34px] items-center gap-1.5 rounded-xl px-2.5 font-semibold text-[12.5px] transition-opacity duration-[230ms] active:scale-95"
							onClick={goBack}
							style={{
								background: `color-mix(in oklab, ${themeColors().textColor} 8%, transparent)`,
								color: themeColors().textColor,
								"margin-top": "calc(env(safe-area-inset-top) + 0.75rem)",
								opacity: chromeOpacity(),
								"pointer-events": chromeOpacity() === 0 ? "none" : "auto",
							}}
							type="button"
						>
							<CaretLeft size={16} weight="bold" />
							Library
						</button>

						{/* The page dims beneath the controls, so they stay findable however dark it gets. */}
						<div
							aria-hidden="true"
							class="pointer-events-none fixed inset-0 z-[35] bg-black"
							style={{ opacity: 1 - brightness() }}
						/>

						<ReaderRail
							coverUrl={meta().coverUrl}
							onContents={() => setSheet("contents")}
							onExplain={() => explain("")}
							onSave={() => void toggleSave()}
							onSettings={() => setSheet("settings")}
							onShare={() => void share("")}
							progress={progress()}
							rest={settings().railRest}
							saved={savedHere()}
							shown={railShown()}
						/>

						<TextPick
							accent={getAccentColors(settings()).save}
							container={container()}
							ink={themeColors().textColor}
							isSaved={passageSaved}
							letGo={[position(), layout(), sheet()]}
							onExplain={explain}
							onSave={(passage) => void toggleSave(passage)}
							onShare={(passage) => void share(passage)}
							paper={themeColors().bgColor}
						/>

						<div
							class="pointer-events-none fixed inset-0 z-30 flex items-center justify-center opacity-0"
							ref={bloomEl}
							style={{ color: getAccentColors(settings()).save }}
						>
							<BookmarkSimple size={130} weight="fill" />
						</div>

						<Show when={inFrontMatter()}>
							<StartReadingPill onClick={startReading} />
						</Show>

						<PulseMoment
							moment={moment()}
							onDone={() => setMoment(undefined)}
						/>

						<BottomSheet
							onClose={() => setSheet(null)}
							panel
							open={sheet() === "contents"}
							title="Contents"
						>
							<ContentsSheet
								author={meta().author}
								bookId={meta().id}
								coverUrl={meta().coverUrl}
								currentChapter={currentChapter()}
								onFind={(hit) => void jumpToMatch(hit)}
								onJump={(i) => void jumpToChapter(i)}
								onQuery={setQuery}
								progress={progress()}
								query={query()}
								savedCount={bookmarks().length}
								searchField={(el) => {
									searchField = el;
								}}
								title={meta().title}
							/>
						</BottomSheet>

						<BottomSheet
							onClose={() => setSheet(null)}
							panel
							open={sheet() === "settings"}
							title="Themes & Settings"
						>
							<ReaderSettingsPanel />
						</BottomSheet>

						<BottomSheet
							onClose={() => setSheet(null)}
							panel
							open={sheet() === "share"}
							title="Share"
						>
							<Show keyed when={sharing()}>
								{(share) => (
									<ShareSheet
										image={share.image}
										name={share.name}
										onShared={() => setSheet(null)}
										text={share.text}
									/>
								)}
							</Show>
						</BottomSheet>

						<BottomSheet
							onClose={() => setSheet(null)}
							panel
							open={sheet() === "explain"}
							title="Explain"
						>
							{/* Afresh for each ask, even one made while the sheet is open. */}
							<Show keyed when={explaining()}>
								{(ask) => (
									<ExplainSheet
										author={meta().author}
										passage={ask.passage}
										selection={ask.selection}
										title={meta().title}
									/>
								)}
							</Show>
						</BottomSheet>
					</>
				)}
			</Show>
		</Show>
	);
}
