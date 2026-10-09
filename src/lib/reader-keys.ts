import { onCleanup, onMount } from "solid-js";
import { keyIsForPage } from "./keys";

export type ReaderAction =
	| "next"
	| "previous"
	| "contents"
	| "explain"
	| "find"
	| "settings"
	| "save"
	| "dim"
	| "leave";

const KEYS: Record<string, ReaderAction> = {
	ArrowDown: "next",
	j: "next",
	PageDown: "next",
	ArrowUp: "previous",
	k: "previous",
	PageUp: "previous",
	c: "contents",
	e: "explain",
	"/": "find",
	t: "settings",
	s: "save",
	l: "dim",
	Escape: "leave",
};

/** What a key does in the reader. Space pages on, and back with Shift; letters answer in either case. */
export function readerAction(
	key: string,
	shift = false,
): ReaderAction | undefined {
	if (key === " ") return shift ? "previous" : "next";
	return KEYS[key.length === 1 ? key.toLowerCase() : key];
}

export type ReaderKeys = Record<ReaderAction, () => void>;

// The reader's keyboard: page with the keys a reader reaches for, and the rail's controls by letter.
export function useReaderKeys(handlers: ReaderKeys) {
	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			// The browser's own find can't see the cards that aren't built, so the book's search takes its key.
			if (
				(e.ctrlKey || e.metaKey) &&
				!e.altKey &&
				!e.defaultPrevented &&
				e.key.toLowerCase() === "f"
			) {
				e.preventDefault();
				return handlers.find();
			}
			if (!keyIsForPage(e)) return;
			// Space on a focused button presses it.
			if (
				e.key === " " &&
				e.target instanceof Element &&
				e.target.closest("button, a")
			)
				return;
			const action = readerAction(e.key, e.shiftKey);
			if (!action) return;
			// Cancelling Esc also keeps the browser's own close request from reaching a sheet that is already shut.
			e.preventDefault();
			handlers[action]();
		};
		document.addEventListener("keydown", onKey);
		onCleanup(() => document.removeEventListener("keydown", onKey));
	});
}
