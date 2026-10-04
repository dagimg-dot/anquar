import { createSignal, onCleanup, onMount } from "solid-js";

// Whether a mouse has moved lately. A tap shows the reader's controls on a phone; with a mouse they follow it,
// and go again when it is still. Touch and pen don't count: their taps already do it.
export function useMouseActivity(idleMs = 2600) {
	const [active, setActive] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		const onMove = (e: PointerEvent) => {
			if (e.pointerType !== "mouse") return;
			setActive(true);
			clearTimeout(timer);
			timer = setTimeout(() => setActive(false), idleMs);
		};
		document.addEventListener("pointermove", onMove, { passive: true });
		onCleanup(() => {
			clearTimeout(timer);
			document.removeEventListener("pointermove", onMove);
		});
	});

	return active;
}
