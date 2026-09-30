import type { Card } from "anquar-core";
import { createEffect, on, onCleanup, onMount } from "solid-js";
import { recordReading } from "./db.ts";
import { dayKey, readTimes, wordsIn } from "./reading.ts";

// A session is reading with no gap longer than this, across app launches.
const SESSION_GAP = 5 * 60_000;
const LAST_READ_KEY = "anquar_last_read_at";

interface OnScreen {
	bookId: string;
	card: Card;
	since: number;
	cap: number;
	timer: ReturnType<typeof setTimeout>;
}

// Times the card on screen while the app is visible: it counts as read once it has been there long enough
// (readTimes), and its time is added when it leaves the screen. onCounted runs after each newly counted
// card, for the reader to react to.
export function useReadingTracker(props: {
	bookId: () => string | undefined;
	card: () => Card | undefined;
	onCounted?: () => void;
}) {
	let onScreen: OnScreen | undefined;

	function begin() {
		const bookId = props.bookId();
		const card = props.card();
		if (!bookId || !card || document.hidden) return;

		const now = Date.now();
		const last = Number(localStorage.getItem(LAST_READ_KEY) ?? 0);
		localStorage.setItem(LAST_READ_KEY, String(now));
		if (now - last > SESSION_GAP)
			void recordReading(bookId, dayKey(), { session: true });

		const { counts, cap } = readTimes(wordsIn(card.blocks));
		const timer = setTimeout(async () => {
			const counted = await recordReading(bookId, dayKey(), {
				cardId: card.id,
			});
			if (counted) props.onCounted?.();
		}, counts * 1000);
		onScreen = { bookId, card, since: performance.now(), cap, timer };
	}

	function settle() {
		if (!onScreen) return;
		clearTimeout(onScreen.timer);
		const seconds = Math.min(
			onScreen.cap,
			(performance.now() - onScreen.since) / 1000,
		);
		localStorage.setItem(LAST_READ_KEY, String(Date.now()));
		if (seconds >= 1)
			void recordReading(onScreen.bookId, dayKey(), { seconds });
		onScreen = undefined;
	}

	createEffect(
		on([props.bookId, props.card], () => {
			if (onScreen && onScreen.card === props.card()) return;
			settle();
			begin();
		}),
	);

	onMount(() => {
		const onVisibility = () => {
			if (document.hidden) settle();
			else if (!onScreen) begin();
		};
		document.addEventListener("visibilitychange", onVisibility);
		onCleanup(() => {
			document.removeEventListener("visibilitychange", onVisibility);
			settle();
		});
	});
}
