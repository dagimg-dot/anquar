import { onCleanup, onMount } from "solid-js";
import { keyIsForPage } from "./keys";
import { type TabId, tabForKey } from "./tabs";

let search: HTMLInputElement | undefined;

/** The Library's search box, so that / can reach it. */
export function registerSearch(input: HTMLInputElement | undefined) {
	search = input;
}

// The keys of the tabs, for a keyboard: a number opens its tab, and / goes to the Library's search.
export function useShellKeys(
	open: (tab: TabId) => void,
	enabled: () => boolean,
) {
	onMount(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!enabled() || !keyIsForPage(e)) return;
			const tab = tabForKey(e.key);
			if (tab) return open(tab);
			if (e.key !== "/") return;
			e.preventDefault();
			open("library");
			// The tab fades in first, so the box is there to focus a frame later.
			requestAnimationFrame(() => requestAnimationFrame(() => search?.focus()));
		};
		document.addEventListener("keydown", onKey);
		onCleanup(() => document.removeEventListener("keydown", onKey));
	});
}
