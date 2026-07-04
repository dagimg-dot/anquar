import { createSignal, For, onMount, Show } from "solid-js";
import { getBook, listBooks } from "../lib/db.ts";
import type { BookMetadata, ChapterData, TocEntry } from "../lib/types.ts";
import { useTikTokScroll } from "../lib/useTikTokScroll.ts";
import CoverCard from "./CoverCard.tsx";
import ChapterCard from "./PaginatedChapter.tsx";

interface BookState {
	chapters: ChapterData[];
	coverImage: string | null;
	id: string;
	metadata: BookMetadata;
	toc: TocEntry[];
}

export default function Feed() {
	const [book, setBook] = createSignal<BookState | null>(null);
	const [loading, setLoading] = createSignal(true);

	let containerRef: HTMLDivElement | undefined;
	useTikTokScroll(() => containerRef);

	onMount(async () => {
		try {
			const books = await listBooks();
			if (books.length > 0) {
				const latest = books[0];
				const fullBook = await getBook(latest.id);
				if (fullBook) {
					setBook({
						id: latest.id,
						metadata: {
							title: latest.title,
							author: latest.author,
							language: latest.language,
							description: latest.description,
							publisher: latest.publisher,
						},
						chapters: fullBook.chapters,
						toc: fullBook.toc,
						coverImage: latest.coverImage ?? null,
					});
				}
			}
		} catch (err) {
			console.error("Failed to load book:", err);
		} finally {
			setLoading(false);
		}
	});

	return (
		<Show
			fallback={
				<div class="flex h-dvh items-center justify-center">
					<div class="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
				</div>
			}
			when={!loading()}
		>
			<Show
				fallback={
					<div class="h-dvh space-y-4 p-4">
						<For each={Array.from({ length: 5 }, (_, i) => i)}>
							{() => <div class="h-dvh animate-pulse rounded-2xl bg-surface" />}
						</For>
					</div>
				}
				when={book()}
			>
				<div class="snap-container h-dvh overflow-y-auto" ref={containerRef}>
					<CoverCard
						author={book()?.metadata.author ?? ""}
						chapterCount={book()?.chapters.length ?? 0}
						coverImage={book()?.coverImage}
						title={book()?.metadata.title ?? ""}
					/>

					<For each={book()?.chapters}>
						{(chapter) => (
							<ChapterCard
								blocks={chapter.blocks}
								title={
									book()?.toc.find((t) => t.href.includes(chapter.id))?.label
								}
							/>
						)}
					</For>
				</div>
			</Show>
		</Show>
	);
}
