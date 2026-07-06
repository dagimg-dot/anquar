import { createSignal, For, onMount, Show } from "solid-js";
import type { EpubCssMeta } from "../epub-renderer/types.ts";
import { getBook, listBooks } from "../lib/db.ts";
import type { BookMetadata, TocEntry } from "../lib/types.ts";
import { useLazyChapters } from "../lib/useLazyChapters.ts";
import { useTikTokScroll } from "../lib/useTikTokScroll.ts";
import CoverCard from "./CoverCard.tsx";
import ChapterCard from "./PaginatedChapter.tsx";

interface BookMeta {
	coverImage: string | null;
	cssMeta?: EpubCssMeta;
	id: string;
	metadata: BookMetadata;
	toc: TocEntry[];
	totalChapters: number;
}

export default function Feed() {
	const [bookMeta, setBookMeta] = createSignal<BookMeta | null>(null);
	const [metaLoaded, setMetaLoaded] = createSignal(false);

	const { chapters, allLoaded, observeSentinel } = useLazyChapters(
		() => bookMeta()?.id ?? "",
	);

	let containerRef: HTMLDivElement | undefined;
	useTikTokScroll(() => containerRef);

	onMount(async () => {
		try {
			const books = await listBooks();
			if (books.length > 0) {
				const latest = books[0];
				const fullBook = await getBook(latest.id);
				if (fullBook) {
					setBookMeta({
						id: latest.id,
						metadata: {
							title: latest.title,
							author: latest.author,
							language: latest.language,
							description: latest.description,
							publisher: latest.publisher,
						},
						toc: fullBook.toc,
						coverImage: latest.coverImage ?? null,
						cssMeta: fullBook.cssMeta,
						totalChapters: fullBook.chapters.length,
					});
				}
			}
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
					<div class="space-y-4 p-4">
						<For each={Array.from({ length: 5 }, (_, i) => i)}>
							{() => <div class="h-dvh animate-pulse rounded-2xl bg-surface" />}
						</For>
					</div>
				}
				when={bookMeta()}
			>
				<div class="snap-container h-dvh overflow-y-auto" ref={containerRef}>
					<CoverCard
						author={bookMeta()?.metadata.author ?? ""}
						chapterCount={bookMeta()?.totalChapters ?? 0}
						coverImage={bookMeta()?.coverImage}
						title={bookMeta()?.metadata.title ?? ""}
					/>

					<For each={chapters()}>
						{(chapter) => (
							<ChapterCard
								blocks={chapter.blocks ?? []}
								classMap={bookMeta()?.cssMeta?.classMap}
								title={
									bookMeta()?.toc.find((t) => t.href.includes(chapter.id))
										?.label
								}
							/>
						)}
					</For>

					<Show when={!allLoaded()}>
						<div ref={observeSentinel} class="h-16" />
					</Show>
				</div>
			</Show>
		</Show>
	);
}
