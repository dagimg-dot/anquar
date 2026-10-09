import { MagnifyingGlass } from "phosphor-solid";
import {
	createEffect,
	createMemo,
	createResource,
	createSignal,
	For,
	on,
	Show,
} from "solid-js";
import {
	type BookIndex,
	indexBook,
	type SearchHit,
	searchBook,
	searchTerm,
	snippetOf,
} from "../lib/book-search.ts";
import { chapterLabel } from "../lib/chapters.ts";
import { listChapters } from "../lib/db.ts";

// Results drawn at a time; the count still covers them all.
const SHOWN = 100;

// The last book searched, so reopening the sheet or searching again doesn't read the book twice.
let indexed: { bookId: string; index: Promise<BookIndex> } | undefined;
function bookIndex(bookId: string) {
	if (indexed?.bookId !== bookId)
		indexed = {
			bookId,
			index: listChapters(bookId)
				.then(indexBook)
				.catch((err) => {
					indexed = undefined;
					throw err;
				}),
		};
	return indexed.index;
}

interface BookSearchProps {
	bookId: string;
	field: (el: HTMLInputElement) => void;
	onFind: (hit: SearchHit) => void;
	onQuery: (query: string) => void;
	query: string;
}

// The open book's search: a field, and below it every match as you type, by chapter.
export default function BookSearch(props: BookSearchProps) {
	const [index] = createResource(() => props.bookId, bookIndex);
	const searching = () => searchTerm(props.query) !== "";
	const found = createMemo(() => {
		const i = index();
		return i && searching() ? searchBook(i, props.query) : undefined;
	});
	const [limit, setLimit] = createSignal(SHOWN);
	createEffect(on(found, () => setLimit(SHOWN)));

	return (
		<>
			<label class="sticky top-0 z-10 -mx-5 block bg-canvas px-5 pt-3 pb-2">
				<span class="relative block">
					<MagnifyingGlass
						aria-hidden="true"
						class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
						size={18}
					/>
					<input
						aria-label="Search this book"
						class="w-full rounded-xl border border-border bg-surface-elevated py-2.5 pr-4 pl-11 text-ink text-sm outline-none transition-colors duration-200 placeholder:text-ink-muted focus:border-brand-500"
						enterkeyhint="search"
						onInput={(e) => props.onQuery(e.currentTarget.value)}
						onKeyDown={(e) => {
							const first = found()?.hits[0];
							if (e.key === "Enter" && first) props.onFind(first);
						}}
						placeholder="Search this book"
						ref={props.field}
						type="search"
						value={props.query}
					/>
				</span>
			</label>

			<Show when={searching()}>
				<Show
					fallback={
						<div class="py-3 text-[14px] text-ink-soft">Reading the book…</div>
					}
					when={found()}
				>
					{(result) => (
						<div class="flex flex-col pb-2">
							<div class="py-2 text-[12px] text-ink-muted tabular-nums">
								{result().total === 0
									? "Not in this book"
									: result().total === 1
										? "1 match"
										: `${result().total.toLocaleString()} matches`}
							</div>
							<For each={result().hits.slice(0, limit())}>
								{(hit, i) => {
									const snippet = snippetOf(index() as BookIndex, hit);
									const opensChapter = () =>
										i() === 0 ||
										result().hits[i() - 1].chapterIndex !== hit.chapterIndex;
									return (
										<>
											<Show when={opensChapter()}>
												<div class="pt-3 pb-1 font-semibold text-[11.5px] text-ink-soft uppercase tracking-[0.06em]">
													{chapterLabel(
														index()?.titles.get(hit.chapterIndex) ?? "",
														hit.chapterIndex,
													)}
												</div>
											</Show>
											<button
												class="rounded-lg px-1 py-2.5 text-left text-[14px] text-ink-soft leading-snug transition-colors active:bg-surface-elevated"
												onClick={() => props.onFind(hit)}
												type="button"
											>
												{snippet.before}
												<mark class="rounded-[3px] bg-brand-500/25 px-px font-semibold text-ink">
													{snippet.match}
												</mark>
												{snippet.after}
											</button>
										</>
									);
								}}
							</For>
							<Show when={result().hits.length > limit()}>
								<button
									class="mt-1 rounded-lg py-3 font-semibold text-[13.5px] text-ink active:bg-surface-elevated"
									onClick={() => setLimit((n) => n + SHOWN)}
									type="button"
								>
									Show more
								</button>
							</Show>
						</div>
					)}
				</Show>
			</Show>
		</>
	);
}
