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
	// Each book is a dropdown of its saves, open until its name is tapped.
	const [closed, setClosed] = createSignal<string[]>([]);
	const isOpen = (id: string) => !closed().includes(id);
	const toggle = (id: string) =>
		setClosed((ids) =>
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
								aria-expanded={isOpen(group.bookId)}
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
							{/* Rows from 0 to their full height, so the saves slide open and shut rather than jump. */}
							<div
								class="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
								style={{
									"grid-template-rows": isOpen(group.bookId) ? "1fr" : "0fr",
								}}
							>
								<div class="overflow-hidden px-5">
									<For each={group.bookmarks}>
										{(bm) => (
											<button
												class="block w-full cursor-pointer text-left transition-opacity duration-150 active:opacity-60"
												onClick={() => visit(bm)}
												tabIndex={isOpen(group.bookId) ? 0 : -1}
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
							</div>
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
