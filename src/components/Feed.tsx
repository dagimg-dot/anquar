import { useParams } from "@solidjs/router";
import type {
	Block,
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

function BlockCard(props: { block: Block; bookId: string }) {
	const { settings, themeColors } = useReaderSettings();

	// Headings and images are focal cards: they read best centred, whatever
	// alignment the reader picked for prose.
	const isFocal = () =>
		props.block.type === "heading" || props.block.type === "image";

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
				classList={{ "max-w-prose": props.block.type !== "image" }}
			>
				<Switch>
					<Match when={props.block.type === "text" && props.block}>
						{(block) => (
							<p class="w-full text-pretty">
								<StyledRuns runs={block().runs} />
							</p>
						)}
					</Match>

					<Match when={props.block.type === "heading" && props.block}>
						{(block) => (
							<h2
								class="w-full text-balance text-center font-semibold tracking-tight"
								style={{ "font-size": HEADING_SIZE[block().level] }}
							>
								<StyledRuns runs={block().runs} />
							</h2>
						)}
					</Match>

					<Match when={props.block.type === "list" && props.block}>
						{(block) => <ListCard block={block()} />}
					</Match>

					<Match when={props.block.type === "image" && props.block}>
						{(block) => <ImageCard block={block()} bookId={props.bookId} />}
					</Match>
				</Switch>
			</div>
		</section>
	);
}

export default function Feed() {
	const params = useParams();
	const [bookMeta, setBookMeta] = createSignal<BookMeta | null>(null);
	const [metaLoaded, setMetaLoaded] = createSignal(false);

	const { chapters, allLoaded, observeSentinel } = useLazyChapters(
		() => bookMeta()?.id ?? "",
	);

	const blocks = createMemo(() => chapters().flatMap((ch) => ch.blocks));

	const [container, setContainer] = createSignal<HTMLDivElement>();
	useTikTokScroll(container);

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
					<div class="snap-container h-dvh overflow-y-auto" ref={setContainer}>
						<CoverCard
							author={meta().author}
							chapterCount={meta().totalChapters}
							coverUrl={meta().coverUrl}
							title={meta().title}
						/>

						<For each={blocks()}>
							{(block) => <BlockCard block={block} bookId={meta().id} />}
						</For>

						<Show when={!allLoaded()}>
							<div class="h-16" ref={observeSentinel} />
						</Show>
					</div>
				)}
			</Show>
		</Show>
	);
}
