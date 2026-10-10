import { useNavigate } from "@solidjs/router";
import { createEffect, createSignal, lazy, on, Show } from "solid-js";
import FinishedList from "../components/FinishedList";
import InProgressRow from "../components/InProgressRow";
import NowReading from "../components/NowReading";
import Prompts from "../components/Prompts";
import ReadingPulse from "../components/ReadingPulse";
import ReviewCard from "../components/ReviewCard";
import { coverUrl } from "../lib/covers";
import { getProgress, listBooks } from "../lib/db";
import { libraryVersion } from "../lib/imports";
import { finishOnboarding, onboarded } from "../lib/onboarding";
import { bookPath } from "../lib/routes";
import { openBook } from "../lib/transitions";
import { splashReady } from "../splash";

// Where each part of the tab sits. A phone stacks them in this order; a tablet lifts the Pulse under the lead;
// a desktop sets the Pulse in a column of its own beside the rest, pinned as they scroll. It stops at top-24, the
// header (h-21 in AppHeader) plus the pt-3 the page starts below it, so it is level with the lead until it sticks.
const PART = {
	review: "order-1 desktop:col-start-1",
	lead: "order-1 desktop:col-start-1",
	shelf: "order-2 tablet:order-3 desktop:col-start-1",
	pulse:
		"order-3 tablet:order-2 desktop:sticky desktop:top-24 desktop:col-start-2 desktop:row-span-3 desktop:row-start-1",
	finished: "order-4 desktop:col-start-1",
} as const;

// Only someone new ever sees it, so it loads only for them.
const Onboarding = lazy(() => import("../components/Onboarding"));

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
			progress: number;
		}[]
	>([]);
	const [loading, setLoading] = createSignal(true);
	const [hasBooks, setHasBooks] = createSignal(false);
	const [welcoming, setWelcoming] = createSignal(false);

	createEffect(on(libraryVersion, () => void load()));

	async function load() {
		try {
			const books = await listBooks();
			if (books.length === 0) {
				if (!onboarded()) setWelcoming(true);
				return;
			}
			if (!onboarded()) finishOnboarding();

			setHasBooks(true);

			const lastOpened = [...books].sort((a, b) => {
				const aTime = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0;
				const bTime = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0;
				return bTime - aTime;
			})[0];

			if (lastOpened) {
				const progress = await getProgress(lastOpened.id);
				setLastBook({
					id: lastOpened.id,
					title: lastOpened.title,
					author: lastOpened.author,
					coverImage: coverUrl(lastOpened.id, lastOpened.coverImage),
					progress: progress?.progressPercent ?? 0,
				});
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
						coverImage: coverUrl(book.id, book.coverImage),
						progress: progress.progressPercent,
					});
				}
			}

			setInProgressBooks(inProgress);
		} catch (err) {
			console.error("Failed to load feed:", err);
		} finally {
			setLoading(false);
			// Onboarding hands the splash its own mark to land on, and says when it's ready.
			if (!welcoming()) splashReady();
		}
	}

	return (
		<div
			class="flex flex-col pb-24 desktop:grid desktop:pt-3 desktop:grid-cols-[minmax(0,1fr)_21.5rem] desktop:items-start desktop:gap-x-8 desktop:gap-y-9"
			data-splash-rise="children"
		>
			<Show when={welcoming()}>
				<Onboarding onDone={() => setWelcoming(false)} />
			</Show>
			<Prompts placement="feed" />
			<Show
				when={!loading()}
				fallback={
					<div class="flex items-center justify-center py-20">
						<div class="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
					</div>
				}
			>
				<Show
					when={hasBooks()}
					fallback={
						<div class="flex flex-col items-center justify-center py-24 px-10 text-center">
							<div class="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mx-auto mb-5">
								<svg
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="1.5"
									aria-hidden="true"
									class="w-7 h-7 text-ink-soft"
								>
									<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
								</svg>
							</div>
							<div class="text-lg font-semibold text-ink mb-1">
								No books yet
							</div>
							<div class="text-sm text-ink-soft leading-relaxed">
								Tap the <strong class="text-brand-500">+</strong> button to
								import your first EPUB
							</div>
						</div>
					}
				>
					<div class={PART.review}>
						<ReviewCard />
					</div>
					<Show when={lastBook()}>
						<div class={PART.lead}>
							<NowReading
								book={lastBook() as NonNullable<ReturnType<typeof lastBook>>}
								onClick={(e) => {
									const book = lastBook();
									if (book)
										openBook(
											() => navigate(bookPath(book.id)),
											book.id,
											e.currentTarget,
										);
								}}
							/>
						</div>
					</Show>
					<Show when={inProgressBooks().length > 0}>
						<div class={PART.shelf}>
							<InProgressRow books={inProgressBooks()} />
						</div>
					</Show>
					<div class={PART.pulse}>
						<ReadingPulse
							onOpen={() => {
								const book = lastBook();
								if (book) openBook(() => navigate(bookPath(book.id)), book.id);
							}}
						/>
					</div>
					<div class={PART.finished}>
						<FinishedList />
					</div>
				</Show>
			</Show>
		</div>
	);
}
