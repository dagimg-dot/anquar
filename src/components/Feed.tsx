import { useParams } from "@solidjs/router";
import type {
	Block,
	HeadingBlock,
	HeadingLevel,
	ImageBlock,
	ListBlock,
	StyleRun,
} from "anquar-core";
import {
	createEffect,
	createMemo,
	createResource,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { coverUrl } from "../lib/covers.ts";
import { getBookMeta, imageKey, listBooks } from "../lib/db.ts";
import { imageUrl } from "../lib/images.ts";
import { useReaderSettings } from "../lib/reader-settings.tsx";
import { useLazyChapters } from "../lib/useLazyChapters.ts";
import { useTikTokScroll } from "../lib/useTikTokScroll.ts";
import CoverCard from "./CoverCard.tsx";

interface BookMeta {
	author: string;
	coverUrl?: string;
	id: string;
	title: string;
	totalChapters: number;
}

const HEADING_SIZE: Record<HeadingLevel, string> = {
	1: "2em",
	2: "1.65em",
	3: "1.4em",
	4: "1.2em",
	5: "1.1em",
	6: "1em",
};

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
				class="max-h-[80dvh] max-w-full rounded-xl object-contain"
				src={url()}
			/>
		</Show>
	);
}

function ListCard(props: { block: ListBlock }) {
	return (
		<Dynamic
			class="flex w-full flex-col gap-[0.7em]"
			component={props.block.ordered ? "ol" : "ul"}
		>
			<For each={props.block.items}>
				{(item, i) => (
					<li
						class="flex gap-[0.6em]"
						style={{ "padding-left": `${item.depth * 1.15}em` }}
					>
						<span class="shrink-0 opacity-45 tabular-nums">
							{props.block.ordered ? `${i() + 1}.` : "—"}
						</span>
						<span>
							<StyledRuns runs={item.runs} />
						</span>
					</li>
				)}
			</For>
		</Dynamic>
	);
}

/**
 * One card per block, except that a run of headings shares a card — deeply
 * nested editions open a chapter with Part / Book / Section / Title in a row,
 * which is four swipes past no reading at all.
 */
function toCards(blocks: Block[]): Block[][] {
	const cards: Block[][] = [];
	for (const block of blocks) {
		const last = cards[cards.length - 1];
		if (block.type === "heading" && last?.[0].type === "heading") {
			last.push(block);
		} else {
			cards.push([block]);
		}
	}
	return cards;
}

const asText = (b: Block) => (b.type === "text" ? b : undefined);
const asList = (b: Block) => (b.type === "list" ? b : undefined);
const asImage = (b: Block) => (b.type === "image" ? b : undefined);
const asHeadings = (blocks: Block[]) =>
	blocks[0].type === "heading" ? (blocks as HeadingBlock[]) : undefined;

function BlockCard(props: { blocks: Block[]; bookId: string }) {
	const { settings, themeColors } = useReaderSettings();

	const block = () => props.blocks[0];

	// Headings and images are focal cards: they read best centred, whatever
	// alignment the reader picked for prose.
	const isFocal = () => block().type === "heading" || block().type === "image";

	return (
		<section
			class="snap-page flex h-dvh flex-col overflow-hidden py-[9dvh]"
			classList={{
				"justify-center": isFocal() || settings().verticalAlign === "center",
				"justify-start": !isFocal() && settings().verticalAlign !== "center",
			}}
			style={{
				background: themeColors().bgColor,
				color: themeColors().textColor,
				"font-size": `${(settings().fontSize / 100) * 1.15}rem`,
				"line-height": String(settings().lineHeight),
				"padding-inline": `${settings().hPadding}rem`,
			}}
		>
			<div
				class="mx-auto flex w-full flex-col items-center"
				classList={{ "max-w-prose": block().type !== "image" }}
			>
				<Switch>
					<Match when={asText(block())}>
						{(text) => (
							<p class="w-full text-pretty">
								<StyledRuns runs={text().runs} />
							</p>
						)}
					</Match>

					<Match when={asHeadings(props.blocks)}>
						{(headings) => (
							<div class="flex w-full flex-col items-center gap-[0.45em]">
								<For each={headings()}>
									{(h) => (
										<h2
											class="w-full text-balance text-center font-semibold tracking-tight"
											style={{ "font-size": HEADING_SIZE[h.level] }}
										>
											<StyledRuns runs={h.runs} />
										</h2>
									)}
								</For>
							</div>
						)}
					</Match>

					<Match when={asList(block())}>
						{(list) => <ListCard block={list()} />}
					</Match>

					<Match when={asImage(block())}>
						{(image) => <ImageCard block={image()} bookId={props.bookId} />}
					</Match>
				</Switch>
			</div>
		</section>
	);
}

/**
 * Offered only while the reader is still in front matter, the way Apple Books
 * surfaces "return to where you began" only after you have jumped.
 */
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

export default function Feed() {
	const params = useParams();
	const [bookMeta, setBookMeta] = createSignal<BookMeta | null>(null);
	const [metaLoaded, setMetaLoaded] = createSignal(false);

	const { chapters, allLoaded, observeSentinel } = useLazyChapters(
		() => bookMeta()?.id ?? "",
	);

	const cards = createMemo(() =>
		toCards(chapters().flatMap((ch) => ch.blocks)),
	);

	const [container, setContainer] = createSignal<HTMLDivElement>();
	useTikTokScroll(container);

	// The cover occupies slot 0, so every card sits one slot further down.
	const bodyStart = createMemo(() => {
		const frontMatter = new Set(
			chapters()
				.filter((ch) => ch.frontMatter)
				.map((ch) => ch.index),
		);
		if (frontMatter.size === 0) return 0;
		const i = cards().findIndex(
			(card) => !frontMatter.has(card[0].chapterIndex),
		);
		return i < 0 ? 0 : i + 1;
	});

	const [position, setPosition] = createSignal(0);
	const inFrontMatter = () => bodyStart() > 0 && position() < bodyStart();

	function trackPosition(e: Event) {
		const el = e.currentTarget as HTMLElement;
		setPosition(Math.round(el.scrollTop / window.innerHeight));
	}

	function startReading() {
		container()?.scrollTo({
			top: bodyStart() * window.innerHeight,
			behavior: "smooth",
		});
	}

	createEffect(async () => {
		const routeId = params.id;
		try {
			// No route id means the tab was opened directly — show the newest book.
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
					<div
						class="snap-container h-dvh overflow-y-auto"
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
							{(card) => <BlockCard blocks={card} bookId={meta().id} />}
						</For>

						<Show when={!allLoaded()}>
							<div class="h-16" ref={observeSentinel} />
						</Show>

						<Show when={inFrontMatter()}>
							<StartReadingPill onClick={startReading} />
						</Show>
					</div>
				)}
			</Show>
		</Show>
	);
}
