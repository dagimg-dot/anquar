import { X } from "phosphor-solid";
import { createSignal, For, Index, Match, Show, Switch } from "solid-js";
import { Portal } from "solid-js/web";
import { gradeWord, type WordRecord } from "../lib/db.ts";
import { tick } from "../lib/haptics.ts";
import { dayKey } from "../lib/reading.ts";
import { choicesFor, isPassage, marked } from "../lib/review.ts";
import { useCloseOnBack } from "../lib/useCloseOnBack.ts";
import BookCover from "./BookCover.tsx";

export interface ReviewItem {
	book: { coverUrl?: string; title: string };
	word: WordRecord;
}

// The day's words, one to a screen. A word is asked as three meanings to pick from; a passage, or a word
// with too few others kept to pick among, as Show me then Not yet / Knew it. Each answer is graded as it's
// given, so leaving partway keeps what was done.
export default function ReviewDeck(props: {
	items: ReviewItem[];
	onClose: () => void;
	pool: WordRecord[];
}) {
	const questions = props.items.map((item) => ({
		...item,
		choices: choicesFor(item.word, props.pool),
	}));
	const [at, setAt] = createSignal(0);
	const [results, setResults] = createSignal<boolean[]>([]);
	const [picked, setPicked] = createSignal<number>();
	const [revealed, setRevealed] = createSignal(false);
	useCloseOnBack(() => true, props.onClose);

	const current = () => questions[at()];
	const answered = () => results()[at()] !== undefined;
	const right = () => results().filter(Boolean).length;

	function grade(isRight: boolean) {
		const id = current().word.id;
		if (id !== undefined) void gradeWord(id, isRight, dayKey());
		setResults((r) => {
			const next = [...r];
			next[at()] = isRight;
			return next;
		});
	}

	function pick(i: number) {
		if (answered()) return;
		tick();
		setPicked(i);
		grade(i === current().choices?.answer);
	}

	function next() {
		setPicked(undefined);
		setRevealed(false);
		setAt((n) => n + 1);
	}

	return (
		<Portal>
			<div class="fixed inset-0 z-[75] overflow-y-auto bg-canvas text-ink">
				<div class="mx-auto flex min-h-full max-w-md flex-col px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
					<div class="flex items-center gap-3">
						<button
							aria-label="Close"
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-ink-soft active:scale-90"
							onClick={props.onClose}
							type="button"
						>
							<X size={15} weight="bold" />
						</button>
						<div class="flex flex-1 gap-1.5">
							<Index each={questions}>
								{(_, i) => (
									<span
										class="h-1 flex-1 rounded-full transition-colors duration-300"
										classList={{
											"bg-brand-500": results()[i] === true,
											"bg-flame": results()[i] === false,
											"bg-ink-muted": results()[i] === undefined && i === at(),
											"bg-surface-elevated":
												results()[i] === undefined && i !== at(),
										}}
									/>
								)}
							</Index>
						</div>
					</div>

					<Show
						fallback={
							<div class="flex flex-1 flex-col items-center justify-center text-center">
								<div class="font-bold text-[12px] text-brand-500 uppercase tracking-[0.06em]">
									Done for today
								</div>
								<div class="mt-2 font-read text-[44px] leading-none">
									{right()} of {questions.length}
								</div>
								<p class="mt-3 max-w-[18rem] text-[15px] text-ink-soft leading-snug">
									{right() === questions.length
										? "All of them. Each comes back a little later than last time."
										: `The ${questions.length - right() === 1 ? "one you missed comes" : "ones you missed come"} back tomorrow.`}
								</p>
								<button
									class="mt-8 h-12 w-full rounded-2xl bg-ink font-semibold text-[15px] text-canvas active:scale-[0.98]"
									onClick={props.onClose}
									type="button"
								>
									Back to anquar
								</button>
							</div>
						}
						when={current()}
					>
						{(q) => (
							<div class="flex flex-1 flex-col">
								<div class="mt-8 flex items-center gap-2.5 text-[12.5px] text-ink-soft">
									<BookCover
										class="h-[31px] w-[22px]"
										src={q().book.coverUrl}
									/>
									<span class="truncate">{q().book.title}</span>
								</div>
								<blockquote class="mt-3.5 font-read text-[19px] leading-normal">
									<For each={marked(q().word.context, q().word.focus)}>
										{(piece) =>
											piece.mark ? (
												<b class="rounded-[3px] bg-brand-500/20 px-0.5 font-medium">
													{piece.text}
												</b>
											) : (
												piece.text
											)
										}
									</For>
								</blockquote>
								<div class="mt-6 mb-2.5 font-semibold text-[14px] text-ink-soft">
									{isPassage(q().word)
										? "What did this passage say?"
										: `What does “${q().word.term}” mean here?`}
								</div>

								<Switch>
									<Match when={q().choices}>
										{(choices) => (
											<>
												<For each={choices().options}>
													{(option, i) => (
														<button
															class="mb-2.5 w-full rounded-2xl border px-4 py-3.5 text-left font-read text-[16px] leading-snug transition-[background-color,border-color,opacity] duration-200"
															classList={{
																"border-border": !answered(),
																"border-brand-500 bg-brand-500/15":
																	answered() && i() === choices().answer,
																"border-flame bg-flame/10":
																	answered() &&
																	i() === picked() &&
																	i() !== choices().answer,
																"border-border opacity-45":
																	answered() &&
																	i() !== picked() &&
																	i() !== choices().answer,
															}}
															onClick={() => pick(i())}
															type="button"
														>
															{option}
														</button>
													)}
												</For>
												<Show when={answered() && q().word.detail}>
													<p class="mt-1 font-read text-[15px] text-ink-soft leading-normal">
														{q().word.detail}
													</p>
												</Show>
												<button
													class="mt-auto h-12 w-full rounded-2xl bg-ink font-semibold text-[15px] text-canvas transition-opacity active:scale-[0.98]"
													classList={{ invisible: !answered() }}
													onClick={next}
													type="button"
												>
													{at() === questions.length - 1 ? "Finish" : "Next"}
												</button>
											</>
										)}
									</Match>
									<Match when={!revealed()}>
										<button
											class="mt-2 h-12 w-full rounded-2xl bg-surface-elevated font-semibold text-[15px] active:scale-[0.98]"
											onClick={() => setRevealed(true)}
											type="button"
										>
											Show me
										</button>
									</Match>
									<Match when={revealed()}>
										<p class="font-read text-[22px] leading-tight">
											{q().word.gist}
										</p>
										<Show when={q().word.detail}>
											<p class="mt-2 font-read text-[15.5px] text-ink-soft leading-normal">
												{q().word.detail}
											</p>
										</Show>
										<div class="mt-auto flex gap-2.5 pt-6">
											<button
												class="h-12 flex-1 rounded-2xl bg-surface-elevated font-semibold text-[15px] active:scale-[0.98]"
												onClick={() => {
													grade(false);
													next();
												}}
												type="button"
											>
												Not yet
											</button>
											<button
												class="h-12 flex-1 rounded-2xl bg-ink font-semibold text-[15px] text-canvas active:scale-[0.98]"
												onClick={() => {
													grade(true);
													next();
												}}
												type="button"
											>
												Knew it
											</button>
										</div>
									</Match>
								</Switch>
							</div>
						)}
					</Show>
				</div>
			</div>
		</Portal>
	);
}
