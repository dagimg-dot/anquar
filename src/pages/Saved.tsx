import { useNavigate } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import BookCover from "../components/BookCover";
import HighlightCard from "../components/HighlightCard";
import { coverUrl } from "../lib/covers";
import { db, getBookMeta } from "../lib/db";

interface BookmarkItem {
	bookId: string;
	chapterIndex: number;
	createdAt: string;
	id?: number;
	label: string;
	textSnippet: string;
}

interface BookGroup {
	bookId: string;
	book: { coverImage?: string; title: string };
	bookmarks: BookmarkItem[];
}

export default function Saved() {
	const navigate = useNavigate();
	const [groups, setGroups] = createSignal<BookGroup[]>([]);
	const [loading, setLoading] = createSignal(true);

	onMount(async () => {
		try {
			const bookmarks = (await db.bookmarks.toArray()) as BookmarkItem[];
			const grouped: Record<string, BookmarkItem[]> = {};
			for (const bm of bookmarks) {
				if (!grouped[bm.bookId]) grouped[bm.bookId] = [];
				grouped[bm.bookId].push(bm);
			}
			const result: BookGroup[] = [];
			for (const [bookId, bms] of Object.entries(grouped)) {
				const book = await getBookMeta(bookId);
				if (book) {
					result.push({
						bookId,
						book: {
							title: book.title,
							coverImage: coverUrl(book.id, book.coverImage),
						},
						bookmarks: bms.sort(
							(a, b) =>
								new Date(b.createdAt).getTime() -
								new Date(a.createdAt).getTime(),
						),
					});
				}
			}
			setGroups(result);
		} finally {
			setLoading(false);
		}
	});

	return (
		<div class="pb-24">
			<Show when={groups().length > 0}>
				<For each={groups()}>
					{(group) => (
						<div class="mb-6">
							{/* biome-ignore lint/a11y/useKeyWithClickEvents: interactive header for navigation */}
							{/* biome-ignore lint/a11y/noStaticElementInteractions: interactive header for navigation */}
							<div
								class="flex items-center gap-3 py-3 px-5 cursor-pointer transition-opacity duration-150 active:opacity-70"
								onClick={() => navigate(`/saved/${group.bookId}`)}
							>
								<BookCover src={group.book.coverImage} class="w-10 h-14" />
								<div class="flex-1 min-w-0">
									<div class="text-base font-semibold text-ink">
										{group.book.title}
									</div>
									<div class="text-xs text-ink-soft mt-0.5">
										{group.bookmarks.length} highlights
									</div>
								</div>
								<div class="text-xl text-ink-soft">›</div>
							</div>
							<div class="px-5">
								<For each={group.bookmarks.slice(0, 3)}>
									{(bm) => (
										<HighlightCard
											text={bm.textSnippet}
											meta={new Date(bm.createdAt).toLocaleDateString()}
										/>
									)}
								</For>
							</div>
							<Show when={group.bookmarks.length > 3}>
								<div class="py-2 px-5 text-sm text-brand-500 font-medium">
									View all {group.bookmarks.length} highlights →
								</div>
							</Show>
						</div>
					)}
				</For>
			</Show>
			<Show when={!loading() && groups().length === 0}>
				<div class="text-center py-12 px-5 text-ink-soft text-sm">
					No highlights yet
				</div>
			</Show>
		</div>
	);
}
