import { createSignal } from "solid-js";
import { importsOpen } from "./imports.ts";

// The Add sheet, opened by every + : add EPUBs from the phone's files, or find one to download first.
const [open, setOpen] = createSignal(false);
const [returning, setReturning] = createSignal(false);

export { open as addOpen, returning as addReturning };

export function openAdd() {
	setReturning(false);
	setOpen(true);
}
export const closeAdd = () => setOpen(false);

/** Where Find a book goes: the channel that posts where to get EPUBs. */
export const FIND_URL = "https://fmhy.net/reading";

const AWAY_MIN = 10_000;
const AWAY_MAX = 60 * 60 * 1000;

// Out of sight for a moment is a glance at another app; a few seconds to an hour is a download.
export const wasDownloading = (awayMs: number) =>
	awayMs >= AWAY_MIN && awayMs <= AWAY_MAX;

let tapped = 0;
let hidden = 0;

/** A site was opened from the sheet, so coming back to anquar after a while means a book may be waiting. */
export function browsed() {
	tapped = Date.now();
	hidden = 0;
}

// A book downloaded in the browser sits in the phone's Downloads, so the sheet comes back up pointing there.
document.addEventListener("visibilitychange", () => {
	if (!tapped) return;
	if (document.visibilityState === "hidden") {
		hidden ||= Date.now();
		return;
	}
	if (!hidden) return;
	const away = Date.now() - hidden;
	tapped = hidden = 0;
	if (!wasDownloading(away) || importsOpen()) return;
	setReturning(true);
	setOpen(true);
});
