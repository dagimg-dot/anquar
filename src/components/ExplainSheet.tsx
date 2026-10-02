import { Copy, Lightbulb } from "phosphor-solid";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	Index,
	Match,
	onCleanup,
	onMount,
	Show,
	Switch,
} from "solid-js";
import toast from "solid-toast";
import { type ExplainError, ExplainFailure, explain } from "../lib/explain.ts";
import { answerParts, phrasesOf, wordsOf } from "../lib/explain-words.ts";
import {
	CONNECT_MESSAGES,
	type ConnectError,
	ConnectFailure,
	connect,
} from "../lib/gemini.ts";
import { tick } from "../lib/haptics.ts";

interface ExplainSheetProps {
	author: string;
	/** The card's text: the context when nothing, or one word, was selected. */
	passage: string;
	/** "" when nothing was selected. */
	selection: string;
	title: string;
}

const MESSAGES: Record<Exclude<ExplainError, "no-key">, string> = {
	refused: "Gemini turned the key down. Check it in Settings.",
	"no-model": "Gemini no longer offers this model. Pick another in Settings.",
	busy: "Gemini is busy. Try again in a moment.",
	offline: "You're offline, and Explain needs a connection.",
	failed: "That request didn't come back. Try again.",
};

type Status = "idle" | "waiting" | "streaming" | "done" | ExplainError;
const failed = (s: Status) =>
	s !== "idle" && s !== "waiting" && s !== "streaming" && s !== "done";

// Words appear at this pace whatever size of pieces the stream arrives in, catching up when it falls behind.
const REVEAL_MS = 28;
// More chips than this scroll in a box of their own, so the answer stays in view below them.
const MANY = 24;

const list = (phrases: string[]) =>
	new Intl.ListFormat("en", { type: "conjunction" }).format(
		phrases.map((p) => `“${p}”`),
	);

/**
 * What was selected is the context, and every word of it a chip. All are on at first; the first tap picks
 * one word and lets the rest go, and each tap after adds or removes one. Explain then asks what those
 * words mean in that context, or, with every chip still on, what the whole of it says. One word selected
 * is asked about at once, in the card's context.
 */
export default function ExplainSheet(props: ExplainSheetProps) {
	const selected = props.selection.trim();
	const context = selected || props.passage;
	const words = wordsOf(context);
	const single = words.length === 1;
	const everyWord = words.map((_, i) => i);

	const [picked, setPicked] = createSignal(everyWord);
	const [touched, setTouched] = createSignal(false);
	const pickedSet = createMemo(() => new Set(picked()));
	const all = () => picked().length === words.length;
	const keyOf = () => picked().join(",");

	function toggle(i: number) {
		tick();
		if (!touched()) {
			setTouched(true);
			setPicked([i]);
			return;
		}
		setPicked((p) =>
			p.includes(i)
				? p.filter((x) => x !== i)
				: [...p, i].sort((a, b) => a - b),
		);
	}

	const [status, setStatus] = createSignal<Status>("idle");
	const [text, setText] = createSignal("");
	const [asked, setAsked] = createSignal<string | null>(null);
	const [question, setQuestion] = createSignal<string[]>([]);
	let controller: AbortController | undefined;
	onCleanup(() => controller?.abort());

	async function ask() {
		controller?.abort();
		const own = new AbortController();
		controller = own;
		const focus = single ? words : all() ? [] : phrasesOf(words, picked());
		setAsked(keyOf());
		setQuestion(focus);
		setText("");
		setShown(0);
		setStatus("waiting");
		try {
			await explain(
				{
					book: { author: props.author, title: props.title },
					context: single ? props.passage : context,
					focus,
				},
				(answer) => {
					setText(answer);
					setStatus("streaming");
				},
				own.signal,
			);
			setStatus("done");
		} catch (error) {
			if (own.signal.aborted) return;
			setStatus(error instanceof ExplainFailure ? error.kind : "failed");
		}
	}

	onMount(() => {
		if (single) void ask();
	});

	const answered = () => asked() === keyOf() && !failed(status());
	const stale = () => !single && asked() !== null && asked() !== keyOf();
	const label = () => {
		if (picked().length === 0) return "Pick a word";
		if (all()) return selected ? "Explain all of it" : "Explain this card";
		const phrases = phrasesOf(words, picked());
		return `What ${list(phrases)} ${phrases.length > 1 ? "mean" : "means"} here`;
	};

	// Only whole words show while the stream is partway through one.
	const parts = createMemo(() => answerParts(text()));
	const whole = (s: string, last: boolean) => {
		const ws = s.split(/\s+/).filter(Boolean);
		return last && status() !== "done" && !/\s$/.test(s) ? ws.slice(0, -1) : ws;
	};
	const gistWords = createMemo(() =>
		whole(parts().gist, parts().detail === "" && !/\n/.test(text())),
	);
	const detailWords = createMemo(() => whole(parts().detail, true));
	const total = () => gistWords().length + detailWords().length;

	const [shown, setShown] = createSignal(0);
	const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
	createEffect(() => {
		const behind = total() - shown();
		if (behind <= 0) return;
		if (reduce) {
			setShown(total());
			return;
		}
		const step = setTimeout(
			() => setShown((n) => n + Math.max(1, Math.floor(behind / 12))),
			REVEAL_MS,
		);
		onCleanup(() => clearTimeout(step));
	});

	async function copy() {
		try {
			await navigator.clipboard.writeText(
				[parts().gist, parts().detail].filter(Boolean).join("\n\n"),
			);
			toast.success("Copied");
		} catch {
			toast.error("Could not copy");
		}
	}

	return (
		<div>
			<Show when={words.length === 0}>
				<p class="pb-4 text-[15px] text-ink-soft">
					There are no words on this card to explain.
				</p>
			</Show>

			<Show when={!single && words.length > 0}>
				<div
					class="flex flex-wrap gap-1.5 py-0.5"
					classList={{
						"max-h-[212px] overflow-y-auto overscroll-contain pb-7 [mask-image:linear-gradient(#000_82%,transparent)]":
							words.length > MANY,
					}}
				>
					<For each={words}>
						{(word, i) => (
							<button
								aria-pressed={pickedSet().has(i())}
								class="h-[34px] rounded-[10px] px-3 font-medium text-[15px] tracking-[-0.005em] transition-[background-color,color,transform] duration-200 active:scale-[0.94]"
								classList={{
									"bg-surface text-ink-soft": !pickedSet().has(i()),
									"bg-brand-500/20 text-ink":
										pickedSet().has(i()) && !touched(),
									"bg-brand-500 text-canvas": pickedSet().has(i()) && touched(),
								}}
								onClick={() => toggle(i())}
								type="button"
							>
								{word}
							</button>
						)}
					</For>
				</div>
				<div class="mt-2 flex min-h-[30px] items-center justify-between text-[12.5px] text-ink-muted">
					<Show
						fallback={<span>Tap a word to ask what it means here</span>}
						when={touched()}
					>
						<span>
							{picked().length} of {words.length}
						</span>
						<Show when={!all()}>
							<button
								class="py-1.5 font-semibold text-brand-500"
								onClick={() => setPicked(everyWord)}
								type="button"
							>
								Select all
							</button>
						</Show>
					</Show>
				</div>
			</Show>

			<Show when={status() !== "idle"}>
				<div
					class="pb-2 transition-opacity duration-200"
					classList={{
						"mt-3 border-border border-t pt-4": !single,
						"opacity-45": stale(),
					}}
				>
					<Show
						fallback={
							<div class="font-read text-[15px] text-ink-soft leading-snug">
								{question().length
									? list(question())
									: selected
										? "All of your selection"
										: "This card"}
							</div>
						}
						when={single}
					>
						<div class="font-medium font-read text-[32px] text-ink leading-[1.1] tracking-[-0.015em]">
							{words[0]}
						</div>
					</Show>
					<Show when={single || question().length > 0}>
						<div class="mt-0.5 truncate text-[12.5px] text-ink-muted">
							{single || !selected
								? "as this card uses it"
								: `in “${selected}”`}
						</div>
					</Show>

					<Switch>
						<Match when={status() === "no-key"}>
							<KeyForm onSaved={ask} />
						</Match>
						<Match when={failed(status())}>
							<p class="mt-4 text-[15px] text-ink-soft leading-normal">
								{MESSAGES[status() as Exclude<ExplainError, "no-key">]}
							</p>
							<button
								class="mt-3 h-9 rounded-full bg-surface px-4 font-medium text-[14px] text-ink active:scale-95"
								onClick={ask}
								type="button"
							>
								Try again
							</button>
						</Match>
						<Match when={shown() === 0}>
							<div aria-label="Thinking" class="explain-rules" role="status">
								<i />
								<i />
								<i />
							</div>
						</Match>
						<Match when={shown() > 0}>
							<p class="mt-3 select-text font-medium font-read text-[25px] text-ink leading-[1.22] tracking-[-0.015em]">
								<Index each={gistWords().slice(0, shown())}>
									{(word) => <span class="explain-word">{word()} </span>}
								</Index>
							</p>
							<p class="mt-2.5 select-text font-read text-[17.5px] text-ink leading-[1.55]">
								<Index
									each={detailWords().slice(
										0,
										Math.max(0, shown() - gistWords().length),
									)}
								>
									{(word) => <span class="explain-word">{word()} </span>}
								</Index>
							</p>
							<Show when={status() === "done" && shown() >= total()}>
								<div class="mt-4 flex items-center gap-2.5">
									<button
										class="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 font-medium text-[13px] text-ink active:scale-95"
										onClick={copy}
										type="button"
									>
										<Copy size={14} />
										Copy
									</button>
									<span class="text-[12px] text-ink-muted">
										{selected && !single
											? "Only your selection left your phone"
											: "Only this card left your phone"}
									</span>
								</div>
							</Show>
						</Match>
					</Switch>
				</div>
			</Show>

			<Show when={!single && words.length > 0}>
				<div class="sticky bottom-0 -mx-5 bg-canvas px-5 pt-3 pb-1">
					<button
						class="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-brand-500 font-semibold text-[16px] text-canvas transition-[opacity,transform] duration-200 active:scale-[0.98] disabled:opacity-35"
						disabled={picked().length === 0 || answered()}
						onClick={ask}
						type="button"
					>
						<Lightbulb class="shrink-0" size={18} weight="fill" />
						<span class="truncate">{label()}</span>
					</button>
				</div>
			</Show>
		</div>
	);
}

// The key goes in right here rather than in Settings, so asking isn't a trip out of the book. Google checks it
// first, and the quickest model it offers is chosen with it.
function KeyForm(props: { onSaved: () => void }) {
	const [key, setKey] = createSignal("");
	const [state, setState] = createSignal<"idle" | "checking" | ConnectError>(
		"idle",
	);
	const save = async (e: SubmitEvent) => {
		e.preventDefault();
		const value = key().trim();
		if (!value || state() === "checking") return;
		setState("checking");
		try {
			await connect(value);
			props.onSaved();
		} catch (error) {
			setState(error instanceof ConnectFailure ? error.kind : "failed");
		}
	};
	return (
		<div class="mt-4">
			<h3 class="font-medium font-read text-[22px] text-ink leading-tight tracking-[-0.01em]">
				Explain needs a Gemini key
			</h3>
			<p class="mt-1 text-[14.5px] text-ink-soft leading-normal">
				It stays on this phone and is used only when you ask. A key from Google
				AI Studio is free.
			</p>
			<form class="mt-4 flex gap-2" onSubmit={save}>
				<input
					aria-label="Gemini key"
					autocomplete="off"
					class="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 font-mono text-ink text-sm outline-none transition-colors focus:border-brand-500"
					onInput={(e) => setKey(e.currentTarget.value)}
					placeholder="Paste your key"
					type="password"
					value={key()}
				/>
				<button
					class="h-11 rounded-full bg-brand-500 px-5 font-semibold text-[15px] text-canvas transition-opacity disabled:opacity-35"
					disabled={!key().trim() || state() === "checking"}
					type="submit"
				>
					{state() === "checking" ? "Checking" : "Save"}
				</button>
			</form>
			<Show when={state() !== "idle" && state() !== "checking"}>
				<p class="mt-2 text-[13px] text-ink-soft">
					{CONNECT_MESSAGES[state() as ConnectError]}
				</p>
			</Show>
			<a
				class="mt-3 inline-block py-1 font-semibold text-[14px] text-brand-500"
				href="https://aistudio.google.com/apikey"
				rel="noreferrer"
				target="_blank"
			>
				Get a key from Google AI Studio
			</a>
		</div>
	);
}
