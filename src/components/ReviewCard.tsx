import { ArrowsClockwise } from "phosphor-solid";
import { createEffect, createSignal, For, on, Show } from "solid-js";
import { coverUrl } from "../lib/covers.ts";
import { getBookMeta, listWords, type WordRecord } from "../lib/db.ts";
import { libraryVersion } from "../lib/imports.ts";
import { dayKey } from "../lib/reading.ts";
import { dueWords, isPassage } from "../lib/review.ts";
import ReviewDeck, { type ReviewItem } from "./ReviewDeck.tsx";

const listed = (titles: string[]) =>
	new Intl.ListFormat("en", { type: "conjunction" }).format(titles);

// On a day something you asked about is due to come back, a card on the Feed tab offers the few minutes'
// quiz. It's gone once they're done, until the next ones fall due.
export default function ReviewCard() {
	const [items, setItems] = createSignal<ReviewItem[]>([]);
	const [pool, setPool] = createSignal<WordRecord[]>([]);
	const [reviewing, setReviewing] = createSignal(false);

	async function load() {
		const all = await listWords();
		const due = dueWords(all, dayKey());
		const books = new Map<string, ReviewItem["book"]>();
		for (const id of new Set(due.map((w) => w.bookId))) {
			const book = await getBookMeta(id);
			if (book)
				books.set(id, {
					coverUrl: coverUrl(book.id, book.coverImage),
					title: book.title,
				});
		}
		setPool(all);
		setItems(
			due.flatMap((word) => {
				const book = books.get(word.bookId);
				return book ? [{ book, word }] : [];
			}),
		);
	}
	createEffect(on(libraryVersion, () => void load()));

	const minutes = () =>
		items().length > 3 ? "a couple of minutes" : "a minute";
	const counted = () => {
		const passages = items().filter((i) => isPassage(i.word)).length;
		const words = items().length - passages;
		return listed(
			[
				words && (words === 1 ? "1 word" : `${words} words`),
				passages && (passages === 1 ? "a passage" : `${passages} passages`),
			].filter((s): s is string => Boolean(s)),
		);
	};
	const titles = () => [...new Set(items().map((i) => i.book.title))];

	return (
		<>
			<Show when={items().length > 0}>
				<div class="mx-4 mb-5 rounded-2xl border border-border bg-surface p-4 tablet:mx-0">
					<div class="flex items-center gap-2 font-bold text-[12px] text-brand-500 uppercase tracking-[0.06em]">
						<ArrowsClockwise size={15} weight="bold" />
						Words to revisit
					</div>
					<div class="mt-1.5 font-medium font-read text-[22px] text-ink tracking-[-0.01em]">
						{counted()}, about {minutes()}
					</div>
					<div class="text-[13.5px] text-ink-soft">From {listed(titles())}</div>
					<div class="mt-3 mb-3.5 flex flex-wrap gap-1.5">
						<For each={items()}>
							{(item) => (
								<span class="max-w-full truncate rounded-full bg-surface-elevated px-2.5 py-0.5 font-read text-[14px] text-ink">
									{isPassage(item.word) ? "a passage" : item.word.term}
								</span>
							)}
						</For>
					</div>
					<button
						class="h-11 w-full rounded-[13px] bg-ink font-semibold text-[15px] text-canvas active:scale-[0.98]"
						onClick={() => setReviewing(true)}
						type="button"
					>
						Start
					</button>
				</div>
			</Show>
			<Show when={reviewing()}>
				<ReviewDeck
					items={items()}
					onClose={() => {
						setReviewing(false);
						void load();
					}}
					pool={pool()}
				/>
			</Show>
		</>
	);
}
