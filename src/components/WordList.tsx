import { useNavigate } from "@solidjs/router";
import { BookOpen, MagnifyingGlass, SpeakerHigh, Trash } from "phosphor-solid";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";
import toast from "solid-toast";
import { coverUrl } from "../lib/covers.ts";
import {
	getBookMeta,
	listWords,
	removeWord,
	type WordRecord,
} from "../lib/db.ts";
import { tick } from "../lib/haptics.ts";
import { dayKey } from "../lib/reading.ts";
import { isPassage, KNOWN, marked } from "../lib/review.ts";
import { bookPath } from "../lib/routes.ts";
import { canSay, say } from "../lib/speech.ts";
import { openBook } from "../lib/transitions.ts";
import BookCover from "./BookCover.tsx";

interface Shelf {
	book: { author: string; coverUrl?: string; id: string; title: string };
	words: WordRecord[];
}

const newestFirst = (a: WordRecord, b: WordRecord) =>
	b.askedAt.localeCompare(a.askedAt);

// Every answer Explain gave, by book, newest first: the word and its gist, opening to the sentence it was
// asked in and the rest of the answer.
export default function WordList(props: { onCount: (n: number) => void }) {
	const navigate = useNavigate();
	const today = dayKey();
	const [shelves, setShelves] = createSignal<Shelf[]>([]);
	const [loading, setLoading] = createSignal(true);
	const [query, setQuery] = createSignal("");
	const [open, setOpen] = createSignal<number>();

	onMount(async () => {
		try {
			const words = await listWords();
			const byBook = new Map<string, WordRecord[]>();
			for (const w of words.sort(newestFirst))
				byBook.set(w.bookId, [...(byBook.get(w.bookId) ?? []), w]);
			const result: Shelf[] = [];
			for (const [bookId, list] of byBook) {
				const book = await getBookMeta(bookId);
				if (!book) continue;
				result.push({
					book: {
						author: book.author,
						coverUrl: coverUrl(book.id, book.coverImage),
						id: book.id,
						title: book.title,
					},
					words: list,
				});
			}
			setShelves(result);
		} finally {
			setLoading(false);
		}
	});

	const shown = createMemo(() => {
		const q = query().trim().toLowerCase();
		if (!q) return shelves();
		const hit = (w: WordRecord) =>
			[w.term, w.gist, w.context].some((s) => s.toLowerCase().includes(q));
		return shelves()
			.map((s) => ({ ...s, words: s.words.filter(hit) }))
			.filter((s) => s.words.length > 0);
	});

	async function forget(word: WordRecord) {
		if (word.id === undefined) return;
		tick();
		await removeWord(word.id);
		setShelves((all) =>
			all
				.map((s) => ({ ...s, words: s.words.filter((w) => w.id !== word.id) }))
				.filter((s) => s.words.length > 0),
		);
		props.onCount(shelves().reduce((n, s) => n + s.words.length, 0));
		toast.success("Deleted");
	}

	const visit = (word: WordRecord) =>
		openBook(
			() => navigate(`${bookPath(word.bookId)}?word=${word.id}`),
			word.bookId,
		);

	return (
		<div>
			<Show when={shelves().length > 0}>
				<label class="relative mx-5 mb-2 block tablet:mx-0">
					<MagnifyingGlass
						aria-hidden="true"
						class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
						size={18}
					/>
					<input
						aria-label="Search your words"
						class="w-full rounded-xl border border-border bg-surface-elevated py-2.5 pr-4 pl-11 text-ink text-sm outline-none transition-colors duration-200 placeholder:text-ink-muted focus:border-brand-500"
						onInput={(e) => setQuery(e.currentTarget.value)}
						placeholder="Search your words"
						type="search"
						value={query()}
					/>
				</label>
			</Show>

			<For each={shown()}>
				{(shelf) => (
					<div class="mb-4">
						<div class="flex items-center gap-3 px-5 py-3 tablet:px-0">
							<BookCover class="h-14 w-10" src={shelf.book.coverUrl} />
							<div class="min-w-0 flex-1">
								<div class="truncate font-semibold text-base text-ink">
									{shelf.book.title}
								</div>
								<div class="mt-0.5 text-ink-soft text-xs">
									{shelf.words.length} kept
									<Show
										when={shelf.words.some((w) => w.dueOn && w.dueOn <= today)}
									>
										{" · "}
										{
											shelf.words.filter((w) => w.dueOn && w.dueOn <= today)
												.length
										}{" "}
										to revisit
									</Show>
								</div>
							</div>
						</div>
						<div class="divide-y divide-border">
							<For each={shelf.words}>
								{(word) => (
									<Row
										due={word.dueOn !== "" && word.dueOn <= today}
										onDelete={() => void forget(word)}
										onOpen={() => visit(word)}
										onToggle={() =>
											setOpen((id) => (id === word.id ? undefined : word.id))
										}
										open={open() === word.id}
										word={word}
									/>
								)}
							</For>
						</div>
					</div>
				)}
			</For>

			<Show when={!loading() && shelves().length === 0}>
				<div class="px-10 py-12 text-center text-ink-soft text-sm leading-relaxed">
					Nothing kept yet. Ask Explain about a word while you read, and it's
					kept here to come back to.
				</div>
			</Show>
			<Show when={shelves().length > 0 && shown().length === 0}>
				<div class="px-5 py-8 text-center text-ink-soft text-sm">
					No word matches that.
				</div>
			</Show>
		</div>
	);
}

function Row(props: {
	due: boolean;
	onDelete: () => void;
	onOpen: () => void;
	onToggle: () => void;
	open: boolean;
	word: WordRecord;
}) {
	const passage = () => isPassage(props.word);
	return (
		<div class="px-5 tablet:px-0">
			<button
				aria-expanded={props.open}
				class="block w-full py-3 text-left"
				onClick={props.onToggle}
				type="button"
			>
				<div class="flex items-baseline gap-2.5">
					<span
						class="min-w-0 font-medium font-read text-ink tracking-[-0.01em]"
						classList={{
							"text-[20px]": !passage(),
							"text-[17px] leading-snug": passage(),
						}}
					>
						{passage() ? props.word.gist : props.word.term}
					</span>
					<Show when={props.due}>
						<span class="ml-auto shrink-0 font-bold text-[11px] text-brand-500 uppercase tracking-[0.04em]">
							Revisit
						</span>
					</Show>
					<Show when={props.word.step >= KNOWN}>
						<span class="ml-auto shrink-0 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.04em]">
							Known
						</span>
					</Show>
				</div>
				<Show when={!passage()}>
					<div class="mt-0.5 text-[14.5px] text-ink leading-snug">
						{props.word.gist}
					</div>
				</Show>
			</button>
			<Show when={props.open}>
				<div class="pb-3">
					<div class="border-border border-l-[3px] pl-2.5 font-read text-[14.5px] text-ink-soft italic leading-normal">
						<For each={marked(props.word.context, props.word.focus)}>
							{(piece) =>
								piece.mark ? (
									<b class="font-semibold text-ink not-italic">{piece.text}</b>
								) : (
									piece.text
								)
							}
						</For>
					</div>
					<Show when={props.word.detail}>
						<p class="mt-2 font-read text-[14.5px] text-ink-soft leading-normal">
							{props.word.detail}
						</p>
					</Show>
					<div class="mt-2.5 flex gap-4 font-semibold text-[13px]">
						<button
							class="flex items-center gap-1.5 py-1 text-ink"
							onClick={props.onOpen}
							type="button"
						>
							<BookOpen size={16} />
							Open in book
						</button>
						<Show when={!passage() && canSay()}>
							<button
								class="flex items-center gap-1.5 py-1 text-ink"
								onClick={() => say(props.word.term)}
								type="button"
							>
								<SpeakerHigh size={16} />
								Say it
							</button>
						</Show>
						<button
							class="flex items-center gap-1.5 py-1 text-ink-muted"
							onClick={props.onDelete}
							type="button"
						>
							<Trash size={16} />
							Delete
						</button>
					</div>
				</div>
			</Show>
		</div>
	);
}
