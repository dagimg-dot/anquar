import { useNavigate } from "@solidjs/router";
import { createSignal, For, onMount, Show } from "solid-js";
import { coverUrl } from "../lib/covers";
import { getProgress, listBooks } from "../lib/db";
import { bookPath } from "../lib/routes";
import { openBook } from "../lib/transitions";
import BookCover from "./BookCover";
import SectionHeader from "./SectionHeader";

interface FinishedBook {
	author: string;
	coverImage?: string;
	id: string;
	title: string;
}

export default function FinishedList() {
	const navigate = useNavigate();
	const [books, setBooks] = createSignal<FinishedBook[]>([]);
	const [loading, setLoading] = createSignal(true);

	onMount(async () => {
		try {
			const allBooks = await listBooks();
			const finished: FinishedBook[] = [];
			for (const book of allBooks) {
				const progress = await getProgress(book.id);
				if (progress && progress.progressPercent >= 100) {
					finished.push({
						id: book.id,
						title: book.title,
						author: book.author,
						coverImage: coverUrl(book.id, book.coverImage),
					});
				}
			}
			setBooks(finished);
		} finally {
			setLoading(false);
		}
	});

	return (
		<div class="mb-6">
			<SectionHeader title="Finished" />
			<Show when={books().length > 0}>
				<For each={books()}>
					{(book) => (
						<button
							type="button"
							class="flex items-center gap-3 py-2 px-5 cursor-pointer bg-transparent border-none w-full text-left [font:inherit] [color:inherit] transition-colors duration-100 active:bg-surface"
							onClick={(e) =>
								openBook(
									() => navigate(bookPath(book.id)),
									book.id,
									e.currentTarget,
								)
							}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ")
									navigate(bookPath(book.id));
							}}
						>
							<BookCover
								class="w-12 h-16"
								data-cover={book.id}
								src={book.coverImage}
							/>
							<div class="flex-1 min-w-0">
								<div class="text-sm font-medium text-ink overflow-hidden text-ellipsis whitespace-nowrap">
									{book.title}
								</div>
								<div class="text-xs text-ink-soft mt-0.5">{book.author}</div>
							</div>
							<div class="w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-semibold">
								✓
							</div>
						</button>
					)}
				</For>
			</Show>
			<Show when={!loading() && books().length === 0}>
				<div class="text-center p-6 text-ink-soft text-sm">
					No finished books yet
				</div>
			</Show>
		</div>
	);
}
