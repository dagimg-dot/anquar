// Screen changes move the way Material motion moves them on Android, through the View Transitions API: tabs
// fade through, a book's cover grows into the reader, and the reader shrinks back into its cover. Without
// the API, or with reduced motion, the screen just changes. The look is in index.css (data-transition).

type Kind = "tab" | "open" | "back";

const animates = () =>
	"startViewTransition" in document &&
	!matchMedia("(prefers-reduced-motion: reduce)").matches;

const named = new Set<HTMLElement>();
function name(el: Element | null | undefined, as: string) {
	if (!(el instanceof HTMLElement)) return;
	el.style.setProperty("view-transition-name", as);
	named.add(el);
}

function run(kind: Kind, before: () => void, update: () => Promise<void>) {
	if (!animates()) return void update();
	const root = document.documentElement;
	root.dataset.transition = kind;
	before();
	const transition = document.startViewTransition(update);
	void transition.finished.finally(() => {
		if (root.dataset.transition === kind) delete root.dataset.transition;
		for (const el of named) el.style.removeProperty("view-transition-name");
		named.clear();
	});
}

const onScreen = (el: Element) => {
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
};
const coverOf = (id: string) =>
	[...document.querySelectorAll(`[data-cover="${CSS.escape(id)}"]`)].find(
		onScreen,
	);
const reader = () => document.querySelector(".snap-container");

// A tab loads its books a moment after it appears, so leaving the reader waits this long for the cover.
const COVER_WAIT_MS = 300;
const coverAppears = (id: string) =>
	new Promise<Element | undefined>((resolve) => {
		const until = performance.now() + COVER_WAIT_MS;
		const look = () => {
			const cover = coverOf(id);
			if (cover || performance.now() > until) resolve(cover);
			else setTimeout(look, 16);
		};
		look();
	});

// The reader says when your card is on screen, so a book grows into its page rather than an empty one.
// Opening waits for that only so long.
const LANDING_WAIT_MS = 600;
let landed: (() => void) | undefined;
export function readerLanded() {
	landed?.();
	landed = undefined;
}
const untilLanded = () =>
	new Promise<void>((resolve) => {
		landed = resolve;
		setTimeout(resolve, LANDING_WAIT_MS);
	});

export function switchTab(update: () => void) {
	run(
		"tab",
		() => {},
		async () => update(),
	);
}

// From the cover that was tapped, or else the book's cover wherever it shows.
export function openBook(go: () => void, id: string, from?: Element | null) {
	const cover = from?.querySelector("[data-cover]") ?? coverOf(id);
	run(
		"open",
		() => name(cover, "book"),
		async () => {
			go();
			await untilLanded();
			name(reader(), "book");
		},
	);
}

export function leaveBook(go: () => void, id: string | undefined) {
	run(
		"back",
		() => name(reader(), "book"),
		async () => {
			go();
			if (id) name(await coverAppears(id), "book");
		},
	);
}

// Back out of the reader moves as its Library button does. The router may hear that back only once the
// reader has been captured, which is why this has to listen before the router does (index.tsx).
export function animateBackFromReader() {
	let replaying = false;
	window.addEventListener("popstate", (e) => {
		const leaving = reader();
		if (
			replaying ||
			!animates() ||
			!(leaving instanceof HTMLElement) ||
			location.pathname.startsWith("/book/")
		)
			return;
		e.stopImmediatePropagation();
		leaveBook(() => {
			replaying = true;
			window.dispatchEvent(new PopStateEvent("popstate", { state: e.state }));
			replaying = false;
		}, leaving.dataset.book);
	});
}
