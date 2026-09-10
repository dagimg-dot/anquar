import { useNavigate } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import AppHeader from "../components/AppHeader";
import BookCover from "../components/BookCover";
import CoverGrid from "../components/CoverGrid";
import FilterChip from "../components/FilterChip";
import { coverUrl } from "../lib/covers";
import { getProgress, listBooks } from "../lib/db";

interface BookWithProgress {
	addedAt: string;
	author: string;
	chapterCount: number;
	coverImage?: string;
	id: string;
	progressPercent: number;
	title: string;
}

const FILTERS = ["All", "Reading", "Finished", "Unread"] as const;

export default function Library() {
	const navigate = useNavigate();
	const [books, setBooks] = createSignal<BookWithProgress[]>([]);
	const [search, setSearch] = createSignal("");
	const [filter, setFilter] = createSignal("All");
	const [loading, setLoading] = createSignal(true);

	onMount(async () => {
		try {
			const allBooks = await listBooks();
			const withProgress = await Promise.all(
				allBooks.map(async (book) => {
					const progress = await getProgress(book.id);
					return {
						...book,
						coverImage: coverUrl(book.id, book.coverImage),
						progressPercent: progress?.progressPercent || 0,
					};
				}),
			);
			setBooks(withProgress);
		} finally {
			setLoading(false);
		}
	});

	const filteredBooks = createMemo(() => {
		let result = books();
		const q = search().toLowerCase();
		if (q) {
			result = result.filter(
				(b) =>
					b.title.toLowerCase().includes(q) ||
					b.author?.toLowerCase().includes(q),
			);
		}
		const f = filter();
		if (f === "Reading")
			result = result.filter(
				(b) => b.progressPercent > 0 && b.progressPercent < 100,
			);
		else if (f === "Finished")
			result = result.filter((b) => b.progressPercent >= 100);
		else if (f === "Unread")
			result = result.filter((b) => b.progressPercent === 0);
		return result;
	});

	return (
		<>
			<AppHeader />
			<div class="pb-24">
				<div class="relative mx-5 mb-4">
					<svg
						class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-ink-muted"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<circle cx="11" cy="11" r="8" />
						<path d="m21 21-4.35-4.35" />
					</svg>
					<input
						class="w-full rounded-xl bg-surface-elevated border border-border py-3 pr-4 pl-11 text-sm text-ink outline-none placeholder:text-ink-muted transition-colors duration-200 focus:border-brand-500"
						type="search"
						placeholder="Search your library…"
						value={search()}
						onInput={(e) => setSearch(e.currentTarget.value)}
					/>
				</div>
				<div class="flex gap-2 pb-4 px-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
					<For each={FILTERS}>
						{(f) => (
							<FilterChip
								label={f}
								active={filter() === f}
								onClick={() => setFilter(f)}
							/>
						)}
					</For>
				</div>
				<Show when={filteredBooks().length > 0}>
					<CoverGrid>
						<For each={filteredBooks()}>
							{(book) => (
								<button
									type="button"
									class="block w-full p-0 m-0 border-0 bg-none text-left cursor-pointer font-[inherit] text-[color:inherit] active:scale-95 transition-transform duration-300"
									onClick={() => navigate(`/book/${book.id}`)}
								>
									<BookCover
										src={book.coverImage}
										progress={book.progressPercent}
									/>
									<div class="text-sm font-medium text-ink mt-2 overflow-hidden text-ellipsis whitespace-nowrap">
										{book.title}
									</div>
									<div class="text-xs text-ink-soft mt-0.5">{book.author}</div>
								</button>
							)}
						</For>
					</CoverGrid>
				</Show>
				<Show when={!loading() && filteredBooks().length === 0}>
					<div class="text-center py-12 px-5 text-ink-soft text-sm">
						No books found
					</div>
				</Show>
			</div>
		</>
	);
}
