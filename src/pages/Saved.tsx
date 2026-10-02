import { useNavigate } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import BookCover from "../components/BookCover";
import HighlightCard from "../components/HighlightCard";
import { coverUrl } from "../lib/covers";
import { db, getBookMeta } from "../lib/db";
import { openBook } from "../lib/transitions";

interface BookmarkItem {
	bookId: string;
	cardId?: string;
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
	// A book shows its three latest saves until it's opened out.
	const [expanded, setExpanded] = createSignal<string[]>([]);
	const isOpen = (id: string) => expanded().includes(id);
	const toggle = (id: string) =>
		setExpanded((ids) =>
			ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
		);
	// A save opens the book at its card, which shows it without making it your reading place (Feed.tsx).
	const visit = (bm: BookmarkItem) =>
		openBook(() => navigate(`/book/${bm.bookId}?saved=${bm.id}`), bm.bookId);

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
							<button
								class="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-opacity duration-150 active:opacity-70"
								onClick={() => toggle(group.bookId)}
								type="button"
							>
								<BookCover
									class="w-10 h-14"
									data-cover={group.bookId}
									src={group.book.coverImage}
								/>
								<div class="flex-1 min-w-0">
									<div class="text-base font-semibold text-ink">
										{group.book.title}
									</div>
									<div class="text-xs text-ink-soft mt-0.5">
										{group.bookmarks.length} highlights
									</div>
								</div>
								<div
									class="text-xl text-ink-soft transition-transform duration-200"
									classList={{ "rotate-90": isOpen(group.bookId) }}
								>
									›
								</div>
							</button>
							<div class="px-5">
								<For
									each={
										isOpen(group.bookId)
											? group.bookmarks
											: group.bookmarks.slice(0, 3)
									}
								>
									{(bm) => (
										<button
											class="block w-full cursor-pointer text-left transition-opacity duration-150 active:opacity-60"
											onClick={() => visit(bm)}
											type="button"
										>
											<HighlightCard
												meta={new Date(bm.createdAt).toLocaleDateString()}
												text={bm.textSnippet}
											/>
										</button>
									)}
								</For>
							</div>
							<Show when={group.bookmarks.length > 3}>
								<button
									class="cursor-pointer px-5 py-2 font-medium text-brand-500 text-sm"
									onClick={() => toggle(group.bookId)}
									type="button"
								>
									{isOpen(group.bookId)
										? "Show fewer"
										: `View all ${group.bookmarks.length} highlights →`}
								</button>
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
