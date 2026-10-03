// Onboarding is shown once, to someone opening anquar with nothing in it. Arriving with a book shared from
// another app, or through the icon's Continue reading, counts as having been here already.
const KEY = "anquar_onboarded";

export function onboarded(): boolean {
	try {
		return localStorage.getItem(KEY) !== null;
	} catch {
		return true;
	}
}

export function finishOnboarding() {
	try {
		localStorage.setItem(KEY, "1");
	} catch {}
}

const arrival = new URLSearchParams(location.search);
if (arrival.has("shared") || arrival.has("continue")) finishOnboarding();
