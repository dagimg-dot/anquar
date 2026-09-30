import { useNavigate, useParams } from "@solidjs/router";
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
	paginate,
	type StyleRun,
	type TextBlock,
} from "anquar-core";
import { BookmarkSimple, CaretLeft } from "phosphor-solid";
import {
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
import {
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
	getProgress,
	imageKey,
	listBookmarks,
	listBooks,
	removeBookmark,
	saveProgress,
} from "../lib/db.ts";
import { imageUrl } from "../lib/images.ts";
import {
	getAccentColors,
	type ReaderSettings,
	useReaderSettings,
} from "../lib/reader-settings.tsx";
import { readSelection } from "../lib/selection.ts";
import { useLazyChapters } from "../lib/useLazyChapters.ts";
import { useReadingTracker } from "../lib/useReadingTracker.ts";
import { useTikTokScroll } from "../lib/useTikTokScroll.ts";
import { splashReady } from "../splash.ts";
import BottomSheet from "./BottomSheet.tsx";
import ContentsSheet from "./ContentsSheet.tsx";
import CoverCard from "./CoverCard.tsx";
import ExplainSheet from "./ExplainSheet.tsx";
import ReaderRail from "./ReaderRail.tsx";
import ReaderSettingsPanel from "./ReaderSettingsPanel.tsx";

const COVER_PAGES = 1;

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
						<span class="shrink-0 opacity-45 tabular-nums">
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

function CardView(props: { card: Card; bookId: string }) {
	const { settings, themeColors } = useReaderSettings();

	const blocks = () => props.card.blocks;
	const centred = () =>
		settings().verticalAlign === "center" ||
		blocks().some((b) => b.type === "image") ||
		blocks().every((b) => b.type === "heading");

	return (
		<section
			class="snap-page flex h-dvh flex-col overflow-hidden py-[9dvh]"
			style={pageStyle(settings(), themeColors())}
		>
			<div
				class="mx-auto flex min-h-0 w-full max-w-prose flex-1 flex-col overflow-y-auto"
				style={{
					gap: `${BLOCK_GAP_LINES * settings().lineHeight}em`,
					"justify-content": centred() ? "safe center" : "flex-start",
				}}
			>
				<For each={blocks()}>
					{(block) => <BlockView block={block} bookId={props.bookId} />}
				</For>
			</div>
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

type SheetName = "contents" | "explain" | "settings";

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
	const navigate = useNavigate();
	const { settings, themeColors } = useReaderSettings();

	const [bookMeta, setBookMeta] = createSignal<BookMeta | null>(null);
	const [metaLoaded, setMetaLoaded] = createSignal(false);

	const { chapters, allLoaded, loadUpTo, observeSentinel } = useLazyChapters(
		() => bookMeta()?.id ?? "",
	);

	const [layout, setLayout] = createSignal<CardLayout>(PHONE_LAYOUT, {
		equals: (a, b) =>
			a.charsPerLine === b.charsPerLine && a.linesPerCard === b.linesPerCard,
	});

	const cards = createMemo<Card[]>(
		(prev) => reuseCards(paginate(chapters(), layout()), prev),
		[],
	);

	const [container, setContainer] = createSignal<HTMLDivElement>();
	useTikTokScroll(container);

	const bodyStart = createMemo(() => {
		const frontMatter = new Set(
			chapters()
				.filter((ch) => ch.frontMatter)
				.map((ch) => ch.index),
		);
		if (frontMatter.size === 0) return 0;
		const i = cards().findIndex((card) => !frontMatter.has(card.chapterIndex));
		return i < 0 ? 0 : i + COVER_PAGES;
	});

	const [position, setPosition] = createSignal(0);
	const [shown, setShown] = createSignal(false);
	const [selection, setSelection] = createSignal("");
	const [sheet, setSheet] = createSignal<SheetName | null>(null);
	const [explaining, setExplaining] = createSignal({
		passage: "",
		selection: "",
	});
	const [bookmarks, setBookmarks] = createSignal<
		Awaited<ReturnType<typeof listBookmarks>>
	>([]);

	const inFrontMatter = () => bodyStart() > 0 && position() < bodyStart();

	const cardIndex = () => position() - COVER_PAGES;
	const currentCard = () => cards()[cardIndex()];

	useReadingTracker({ bookId: () => bookMeta()?.id, card: currentCard });

	let lastTap = 0;
	let downX = 0;
	let downY = 0;
	let bloomEl: HTMLDivElement | undefined;

	const reduceMotion = () =>
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	const railShown = () => shown() || selection().length > 0;

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
		return bookmarks().map((b) =>
			b.cardId ? findCardHolding(list, b.cardId) : (b.cardIndex ?? -1),
		);
	});

	const savedHere = () => savedCardIndexes().includes(cardIndex());

	const chromeOpacity = () => {
		if (railShown() || settings().railRest === "always") return 1;
		return settings().railRest === "hidden" ? 0 : 0.3;
	};

	async function refreshBookmarks() {
		const id = bookMeta()?.id;
		if (id) setBookmarks(await listBookmarks(id));
	}

	async function toggleSave() {
		const meta = bookMeta();
		const card = currentCard();
		if (!meta || !card) return;

		const existing = bookmarks().find(
			(_, i) => savedCardIndexes()[i] === cardIndex(),
		);
		if (existing?.id !== undefined) {
			await removeBookmark(existing.id);
			toast.success("Removed from shelf");
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
				textSnippet: cardText(card.blocks).slice(0, 280),
			});
			toast.success("Saved to your shelf");
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
		pages?.[index + COVER_PAGES]?.scrollIntoView({
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

	createEffect(
		on(
			() => bookMeta()?.id,
			async (id) => {
				if (!id) return;
				const saved = await getProgress(id);
				if (!saved?.cardId || id !== bookMeta()?.id) return;
				await loadUpTo(saved.chapterIndex);
				const index = findCardHolding(cards(), saved.cardId);
				if (index < 0) return;
				anchor = saved.cardId;
				requestAnimationFrame(() => scrollToCard(index, true));
			},
		),
	);

	async function jumpToChapter(chapterIndex: number) {
		setSheet(null);
		await loadUpTo(chapterIndex);
		const i = cards().findIndex((c) =>
			c.blocks.some((b) => b.chapterIndex === chapterIndex),
		);
		if (i >= 0) scrollToCard(i);
	}

	async function share(picked: string) {
		const meta = bookMeta();
		const card = currentCard();
		if (!meta || !card) return;

		const text = `"${picked || cardText(card.blocks)}"\n— ${meta.title}, ${meta.author}`;
		if (navigator.share) {
			await navigator.share({ text }).catch(() => {});
			return;
		}
		try {
			await navigator.clipboard.writeText(text);
			toast.success("Passage copied");
		} catch {
			toast.error("Could not share this passage");
		}
	}

	function explain(picked: string) {
		const card = currentCard();
		if (!card) return;
		setExplaining({
			passage: picked || cardText(card.blocks),
			selection: picked,
		});
		setSheet("explain");
	}

	function trackPosition(e: Event) {
		const el = e.currentTarget as HTMLElement;
		if (el.clientHeight > 0) {
			setPosition(Math.round(el.scrollTop / el.clientHeight));
		}
	}

	function onPointerUp(e: PointerEvent) {
		if ((e.target as HTMLElement | null)?.closest(".rail")) return;
		const wasSwipe =
			Math.abs(e.clientX - downX) > 10 || Math.abs(e.clientY - downY) > 10;
		if (wasSwipe) return;
		if (readSelection(container())) return;

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

	function startReading() {
		const el = container();
		const page = el?.querySelectorAll<HTMLElement>(".snap-page")[bodyStart()];
		page?.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	onMount(() => {
		const onSelectionChange = () => setSelection(readSelection(container()));
		document.addEventListener("selectionchange", onSelectionChange);
		onCleanup(() =>
			document.removeEventListener("selectionchange", onSelectionChange),
		);
	});

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
							onPointerDown={(e) => {
								downX = e.clientX;
								downY = e.clientY;
							}}
							onPointerUp={onPointerUp}
							onScroll={trackPosition}
							ref={setContainer}
						>
							<CoverCard
								author={meta().author}
								chapterCount={meta().totalChapters}
								coverUrl={meta().coverUrl}
								title={meta().title}
							/>

							<For each={cards()}>
								{(card) => <CardView bookId={meta().id} card={card} />}
							</For>

							<Show when={!allLoaded()}>
								<div class="h-16" ref={observeSentinel} />
							</Show>
						</div>

						<button
							aria-label="Back to library"
							class="fixed top-0 left-0 z-40 m-3 flex h-[34px] items-center gap-1.5 rounded-xl px-2.5 font-semibold text-[12.5px] transition-opacity duration-[230ms] active:scale-95"
							onClick={() => navigate("/")}
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

						<ReaderRail
							coverUrl={meta().coverUrl}
							onContents={() => setSheet("contents")}
							onExplain={explain}
							onSave={() => void toggleSave()}
							onSettings={() => setSheet("settings")}
							onShare={(picked) => void share(picked)}
							progress={progress()}
							rest={settings().railRest}
							saved={savedHere()}
							selection={selection()}
							shown={railShown()}
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

						<BottomSheet
							onClose={() => setSheet(null)}
							open={sheet() === "contents"}
							title="Contents"
						>
							<ContentsSheet
								author={meta().author}
								bookId={meta().id}
								coverUrl={meta().coverUrl}
								currentChapter={currentChapter()}
								onJump={(i) => void jumpToChapter(i)}
								progress={progress()}
								savedCount={bookmarks().length}
								title={meta().title}
							/>
						</BottomSheet>

						<BottomSheet
							onClose={() => setSheet(null)}
							open={sheet() === "settings"}
							title="Themes & Settings"
						>
							<ReaderSettingsPanel />
						</BottomSheet>

						<BottomSheet
							onClose={() => setSheet(null)}
							open={sheet() === "explain"}
							title="Explain"
						>
							<ExplainSheet
								author={meta().author}
								passage={explaining().passage}
								selection={explaining().selection}
								title={meta().title}
							/>
						</BottomSheet>
					</>
				)}
			</Show>
		</Show>
	);
}
