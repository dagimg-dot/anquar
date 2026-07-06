import { useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import FinishedList from "../components/FinishedList";
import InProgressRow from "../components/InProgressRow";
import NowReading from "../components/NowReading";
import ReadingPulse from "../components/ReadingPulse";
import { getBook, getProgress, listBooks } from "../lib/db";

export default function FeedPage() {
	const navigate = useNavigate();
	const [lastBook, setLastBook] = createSignal<{
		id: string;
		title: string;
		author: string;
		coverImage?: string;
		progress?: number;
	} | null>(null);
	const [inProgressBooks, setInProgressBooks] = createSignal<
		{
			id: string;
			title: string;
			author: string;
			coverImage?: string;
			progress: number;
		}[]
	>([]);
	const [loading, setLoading] = createSignal(true);

	onMount(async () => {
		try {
			const books = await listBooks();
			if (books.length === 0) return;

			const lastOpened = [...books].sort((a, b) => {
				const aTime = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
				const bTime = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
				return bTime - aTime;
			})[0];

			if (lastOpened) {
				const fullBook = await getBook(lastOpened.id);
				if (fullBook) {
					const progress = await getProgress(lastOpened.id);
					setLastBook({
						id: lastOpened.id,
						title: lastOpened.title,
						author: lastOpened.author,
						coverImage: lastOpened.coverImage,
						progress: progress?.progressPercent ?? 0,
					});
				}
			}

			const inProgress: {
				id: string;
				title: string;
				author: string;
				coverImage?: string;
				progress: number;
			}[] = [];

			for (const book of books) {
				const progress = await getProgress(book.id);
				if (
					progress &&
					progress.progressPercent > 0 &&
					progress.progressPercent < 100
				) {
					inProgress.push({
						id: book.id,
						title: book.title,
						author: book.author,
						coverImage: book.coverImage,
						progress: progress.progressPercent,
					});
				}
			}

			setInProgressBooks(inProgress);
		} catch (err) {
			console.error("Failed to load feed:", err);
		} finally {
			setLoading(false);
		}
	});

	return (
		<div class="feed-page">
			<Show
				when={!loading()}
				fallback={
					<div class="flex items-center justify-center py-20">
						<div class="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
					</div>
				}
			>
				<Show when={lastBook()}>
					<NowReading
						book={lastBook() as NonNullable<ReturnType<typeof lastBook>>}
						onClick={() => {
							const book = lastBook();
							if (book) navigate(`/book/${book.id}`);
						}}
					/>
				</Show>
				<Show when={inProgressBooks().length > 0}>
					<InProgressRow books={inProgressBooks()} />
				</Show>
				<ReadingPulse />
				<FinishedList />
				<Show when={!lastBook() && inProgressBooks().length === 0}>
					<div class="feed-empty">
						<div class="feed-empty-icon">
							<svg
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="1.5"
								aria-hidden="true"
							>
								<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
							</svg>
						</div>
						<div class="feed-empty-title">No books yet</div>
						<div class="feed-empty-text">Import an EPUB to start reading</div>
					</div>
				</Show>
			</Show>
		</div>
	);
}
