import { createSignal } from "solid-js";

// Chrome offers to install anquar through beforeinstallprompt, fired once a page and early. It's caught at
// start-up and held, which also keeps Chrome's own mini-infobar away, so the app can ask in its own words
// instead of leaving the offer in Chrome's menu. Safari has no such event, so on an iPhone nothing shows.

interface InstallPrompt extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const LATER_KEY = "anquar_install_later";
const LATER_MS = 14 * 24 * 60 * 60 * 1000;

const [offer, setOffer] = createSignal<InstallPrompt>();
const [later, setLater] = createSignal(readLater());

window.addEventListener("beforeinstallprompt", (e) => {
	e.preventDefault();
	setOffer(e as InstallPrompt);
});
window.addEventListener("appinstalled", () => setOffer(undefined));

function readLater(): number {
	try {
		return Number(localStorage.getItem(LATER_KEY)) || 0;
	} catch {
		return 0;
	}
}

// Chrome doesn't offer to install what's already installed, and appinstalled drops a held offer; running as the
// installed app is ruled out on its own too, whatever Chrome sends.
const installed = () =>
	matchMedia("(display-mode: standalone)").matches ||
	(navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Chrome will install the app if asked, and it isn't installed already. */
export const canInstall = () => offer() !== undefined && !installed();

/** Worth a card on the Feed tab: installable, and not put off in the last two weeks. */
export const suggestInstall = () =>
	canInstall() && Date.now() - later() > LATER_MS;

export function installLater() {
	const now = Date.now();
	setLater(now);
	try {
		localStorage.setItem(LATER_KEY, String(now));
	} catch {}
}

// A prompt can be shown only once; dismissed, Chrome offers it again on a later visit.
export async function install(): Promise<boolean> {
	const prompt = offer();
	if (!prompt) return false;
	setOffer(undefined);
	await prompt.prompt();
	return (await prompt.userChoice).outcome === "accepted";
}
