import { useNavigate } from "@solidjs/router";
import { DotsThree } from "phosphor-solid";
import { createSignal, For, onMount, Show } from "solid-js";
import BookCover from "../components/BookCover";
import HighlightCard from "../components/HighlightCard";
import PassageSheet, { type HeldPassage } from "../components/PassageSheet";
import WordList from "../components/WordList";
import { coverUrl } from "../lib/covers";
import { db, getBookMeta } from "../lib/db";
import { tick } from "../lib/haptics";
import { bookPath } from "../lib/routes";
import { savedQuote } from "../lib/saved-quote";
import { openBook } from "../lib/transitions";

interface BookmarkItem {
	bookId: string;
	cardId?: string;
	chapterIndex: number;
	createdAt: string;
	id?: number;
	label: string;
	passage?: boolean;
	textSnippet: string;
}

interface BookGroup {
	bookId: string;
	book: { author: string; coverImage?: string; title: string };
	bookmarks: BookmarkItem[];
}

export default function Saved() {
	const navigate = useNavigate();
	const [groups, setGroups] = createSignal<BookGroup[]>([]);
	const [loading, setLoading] = createSignal(true);
	// What you kept from books, and what Explain told you: two views, one tab.
	const [view, setView] = createSignal<"passages" | "words">("passages");
	const [wordCount, setWordCount] = createSignal(0);
	const saveCount = () => groups().reduce((n, g) => n + g.bookmarks.length, 0);
	// Each book is a dropdown of its saves, open until its name is tapped.
	const [closed, setClosed] = createSignal<string[]>([]);
	const isOpen = (id: string) => !closed().includes(id);
	const toggle = (id: string) =>
		setClosed((ids) =>
			ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
		);
	// A save opens the book at its card, which shows it without making it your reading place (Feed.tsx).
	const visit = (bm: BookmarkItem) =>
		openBook(
			() => navigate(`${bookPath(bm.bookId)}?saved=${bm.id}`),
			bm.bookId,
		);

	// Held (or right-clicked), a save offers Share and Delete, as a held book in the Library offers its editor.
	const [held, setHeld] = createSignal<HeldPassage>();
	const hold = (group: BookGroup, bm: BookmarkItem) => {
		if (bm.id === undefined) return;
		tick();
		setHeld({
			book: {
				author: group.book.author,
				coverUrl: group.book.coverImage,
				title: group.book.title,
			},
			id: bm.id,
			quote: savedQuote(bm.textSnippet, !bm.passage),
		});
	};
	const forget = (id: number) =>
		setGroups((gs) =>
			gs
				.map((g) => ({
					...g,
					bookmarks: g.bookmarks.filter((b) => b.id !== id),
				}))
				.filter((g) => g.bookmarks.length > 0),
		);

	onMount(async () => {
		void db.words.count().then(setWordCount);
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
							author: book.author,
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
			<div class="mx-5 mb-3 flex rounded-xl bg-surface-elevated p-[3px] tablet:mx-0 tablet:max-w-xs">
				<For
					each={
						[
							["passages", "Passages", saveCount],
							["words", "Words", wordCount],
						] as const
					}
				>
					{([id, label, count]) => (
						<button
							aria-pressed={view() === id}
							class="h-[34px] flex-1 rounded-[9px] font-semibold text-[13.5px] transition-colors"
							classList={{
								"bg-canvas text-ink shadow-sm": view() === id,
								"text-ink-soft": view() !== id,
							}}
							onClick={() => setView(id)}
							type="button"
						>
							{label}
							<span class="ml-1 font-medium text-ink-muted tabular-nums">
								{count()}
							</span>
						</button>
					)}
				</For>
			</div>
			<Show when={view() === "words"}>
				<WordList onCount={setWordCount} />
			</Show>
			<Show when={view() === "passages" && groups().length > 0}>
				<For each={groups()}>
					{(group) => (
						<div class="mb-6">
							<button
								class="flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-opacity duration-150 active:opacity-70 tablet:px-0"
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
										{group.bookmarks.length} highlight
										{group.bookmarks.length === 1 ? "" : "s"}
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
								{/* Two columns from tablet up, each save a card of its own. */}
								<div class="overflow-hidden px-5 tablet:columns-2 tablet:gap-4 tablet:px-0">
									<For each={group.bookmarks}>
										{(bm) => (
											<div class="group relative tablet:mb-4 tablet:break-inside-avoid">
												<button
													class="block w-full cursor-pointer text-left transition-opacity duration-150 active:opacity-60"
													onClick={() => visit(bm)}
													onContextMenu={(e) => {
														e.preventDefault();
														hold(group, bm);
													}}
													tabIndex={isOpen(group.bookId) ? 0 : -1}
													type="button"
												>
													<HighlightCard
														class="tablet:rounded-2xl tablet:border tablet:border-border tablet:bg-surface tablet:px-5 tablet:py-4 tablet:transition-colors tablet:group-hover:border-ink-muted"
														meta={new Date(bm.createdAt).toLocaleDateString()}
														text={savedQuote(bm.textSnippet, !bm.passage)}
													/>
												</button>
												{/* Where a phone holds a save, a mouse reaches for this: Share and Delete. */}
												<button
													aria-label="Share or delete this save"
													class="absolute top-2.5 right-2.5 hidden size-[30px] cursor-pointer place-items-center rounded-lg bg-surface-elevated text-ink-soft opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 tablet:grid"
													onClick={() => hold(group, bm)}
													tabIndex={isOpen(group.bookId) ? 0 : -1}
													type="button"
												>
													<DotsThree
														aria-hidden="true"
														size={20}
														weight="bold"
													/>
												</button>
											</div>
										)}
									</For>
								</div>
							</div>
						</div>
					)}
				</For>
			</Show>
			<Show when={view() === "passages" && !loading() && groups().length === 0}>
				<div class="text-center py-12 px-5 text-ink-soft text-sm">
					No highlights yet
				</div>
			</Show>
			<PassageSheet
				onClose={() => setHeld(undefined)}
				onDeleted={forget}
				passage={held()}
			/>
		</div>
	);
}
