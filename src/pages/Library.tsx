import { useNavigate } from "@solidjs/router";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import BookCover from "../components/BookCover";
import CoverGrid from "../components/CoverGrid";
import FilterChip from "../components/FilterChip";
import { getProgress, listBooks } from "../lib/db";

interface BookWithProgress {
	addedAt: string;
	author: string;
	chapterCount: number;
	coverImage?: string;
	id: string;
	language: string;
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
		<div class="py-4 pb-24">
			<input
				class="w-full py-3 px-5 border-0 border-b border-border bg-transparent text-ink text-lg outline-none placeholder:text-ink-soft"
				type="text"
				placeholder="Search books..."
				value={search()}
				onInput={(e) => setSearch(e.currentTarget.value)}
			/>
			<div class="flex gap-2 py-3 px-5 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
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
	);
}
