import { registerSW } from "virtual:pwa-register";
import { createSignal } from "solid-js";
import toast from "solid-toast";
import { splashGone } from "../splash.ts";
import {
	newer,
	RELEASES,
	type Release,
	releasesAfter,
	VERSION,
} from "./changelog";

// A deploy reaches the app as a new service worker, which waits until it's taken from the Feed tab's card,
// so nothing reloads under a book. Closing the app takes it too.

// The version whose notes were last seen on this phone.
const SEEN_KEY = "anquar_version";
// Kept across the reload an update makes, so the app opens on what it brought.
const UPDATED_KEY = "anquar_updated";
const CHECK_MS = 60 * 60 * 1000;

const [ready, setReady] = createSignal(false);
const [incoming, setIncoming] = createSignal<Release>();

/** A newer version is waiting; incoming() is its newest release, unless it brings only fixes. */
export { incoming, ready as updateReady };

const takeUpdate = registerSW({
	async onNeedRefresh() {
		setIncoming(await fetchIncoming());
		setReady(true);
	},
	onRegisteredSW(_url, registration) {
		if (registration) checkOnReturn(registration);
	},
});

async function fetchIncoming(): Promise<Release | undefined> {
	try {
		const res = await fetch("/app/changelog.json", { cache: "no-cache" });
		const [latest] = (await res.json()) as Release[];
		return latest && newer(latest.version, VERSION) ? latest : undefined;
	} catch {
		return undefined;
	}
}

// Chrome looks for a new worker when the app is opened, but not when it comes back from the background, where
// an installed app spends most of its life, so it's asked then too, once an hour at most.
function checkOnReturn(registration: ServiceWorkerRegistration) {
	let last = Date.now();
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState !== "visible" || Date.now() - last < CHECK_MS)
			return;
		last = Date.now();
		registration.update().catch(() => {});
	});
}

export function update() {
	try {
		sessionStorage.setItem(UPDATED_KEY, "1");
	} catch {}
	void takeUpdate(true);
}

// With nothing kept yet, someone who read before versions were kept has the newest release to catch up on, and
// someone new has nothing. One kept from a release since rolled back would hide that release's return.
function readSeen(): string {
	try {
		const kept = localStorage.getItem(SEEN_KEY);
		if (kept && !newer(kept, VERSION)) return kept;
		if (kept) {
			localStorage.setItem(SEEN_KEY, VERSION);
			return VERSION;
		}
		const before = localStorage.getItem("anquar_last_read_at") !== null;
		const seen = before ? (RELEASES[1]?.version ?? "0.0.0") : VERSION;
		localStorage.setItem(SEEN_KEY, seen);
		return seen;
	} catch {
		return VERSION;
	}
}

const [seen, setSeen] = createSignal(readSeen());

/** Releases this phone runs whose notes haven't been seen, newest first. */
export const unseen = () => releasesAfter(seen());

function takeUpdated(): boolean {
	try {
		const updated = sessionStorage.getItem(UPDATED_KEY) !== null;
		sessionStorage.removeItem(UPDATED_KEY);
		return updated;
	} catch {
		return false;
	}
}

/** This page is the reload an update made. */
export const justUpdated = takeUpdated();

/** The Feed tab's card: an update to take, or notes of one taken by closing the app. */
export const updateCard = (): "ready" | "updated" | undefined => {
	if (ready()) return "ready";
	if (unseen().length > 0 && !justUpdated) return "updated";
	return undefined;
};

const [open, setOpen] = createSignal(false);
// Kept as it was when the sheet opened, so the releases it marks New stay marked while it's read.
const [since, setSince] = createSignal(seen());

export { open as whatsNewOpen, since as whatsNewSince };

export function openWhatsNew() {
	setSince(seen());
	setSeen(VERSION);
	try {
		localStorage.setItem(SEEN_KEY, VERSION);
	} catch {}
	setOpen(true);
}

export const closeWhatsNew = () => setOpen(false);

// After the reload an update made, what it brought opens once the splash has landed.
if (justUpdated)
	void splashGone.then(() =>
		unseen().length > 0 ? openWhatsNew() : toast.success("anquar updated"),
	);
