import { createSignal } from "solid-js";

// The widths the layout changes at are named in index.css as the tablet: (720px) and desktop: (1080px)
// variants. This is the tablet one for code that has to choose what to render rather than how to style it.
const TABLET_PX = 720;

function watch(query: string) {
	const media = matchMedia(query);
	const [matches, setMatches] = createSignal(media.matches);
	media.addEventListener("change", (e) => setMatches(e.matches));
	return matches;
}

/** From the icon rail up: the bottom bar and its sheets give way to a sidebar, dialogs and panels. */
export const isTablet = watch(`(min-width: ${TABLET_PX}px)`);
