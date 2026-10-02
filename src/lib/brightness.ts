import { createSignal } from "solid-js";

// The web can't set the screen's brightness, so the reader dims its page under a dark layer instead: from
// the phone's own brightness down to MIN_BRIGHTNESS, never darker, so the page is never lost. One level for
// every book, kept beside the app's other preferences.
export const MIN_BRIGHTNESS = 0.3;
const KEY = "anquar_brightness";

const clamp = (value: number) => Math.min(1, Math.max(MIN_BRIGHTNESS, value));

function stored() {
	try {
		const value = Number(localStorage.getItem(KEY) ?? 1);
		return Number.isFinite(value) ? clamp(value) : 1;
	} catch {
		return 1;
	}
}

const [brightness, setLevel] = createSignal(stored());

export { brightness };

export function setBrightness(value: number) {
	const level = clamp(value);
	setLevel(level);
	try {
		localStorage.setItem(KEY, String(level));
	} catch {
		// Without storage it holds for this visit only.
	}
}
