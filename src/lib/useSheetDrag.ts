import { createEffect, createSignal, onCleanup } from "solid-js";

// How far a finger moves before the gesture is read as a drag, a scroll or a tap.
const SLOP = 6;
// Released past this share of its height, or flicked down faster than FLICK, the sheet closes.
const CLOSE_AT = 0.25;
const FLICK = 0.45; // px per ms
// How far a sheet gives when pulled the way it can't go, at most. Pulled up, what shows below it is the
// sheet's own ground, which each sheet extends past its bottom edge (after:top-full).
const STRETCH = 48;
const SETTLE_MS = 450;
const SETTLE = `transform ${SETTLE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;

const give = (pull: number) => (STRETCH * pull) / (STRETCH + pull);

function scrollerUnder(target: EventTarget | null, sheet: HTMLElement) {
	for (
		let el = target as HTMLElement | null;
		el && el !== sheet;
		el = el.parentElement
	) {
		const { overflowY } = getComputedStyle(el);
		if (
			/(auto|scroll)/.test(overflowY) &&
			el.scrollHeight > el.clientHeight + 1
		)
			return el;
	}
	return null;
}

// Moves a bottom sheet the way a native one moves: it follows the finger, or a mouse, down from anywhere on it, gives a
// little when pulled up, lets content inside scroll first, and on release either closes, at the speed it
// was flicked, or springs back. Touch events rather than pointer events, because only a touchmove can stop
// the scroll underneath once the sheet has the gesture.
export function useSheetDrag(
	sheet: () => HTMLElement | undefined,
	close: () => void,
	canClose: () => boolean = () => true,
) {
	const [offset, setOffset] = createSignal(0);
	const [dragging, setDragging] = createSignal(false);
	const [settle, setSettle] = createSignal<string>();
	const [height, setHeight] = createSignal(1);
	const reduce = matchMedia("(prefers-reduced-motion: reduce)");

	createEffect(() => {
		const el = sheet();
		if (!el) return;
		let startX = 0;
		let startY = 0;
		let decided = false;
		let scroller: HTMLElement | null = null;
		let samples: [number, number][] = [];
		let closing: ReturnType<typeof setTimeout> | undefined;

		const begin = (x: number, y: number, target: EventTarget | null) => {
			startX = x;
			startY = y;
			decided = false;
			scroller = scrollerUnder(target, el);
			samples = [];
		};

		// Whether the sheet has the gesture, so a touch can keep the page underneath from scrolling.
		const follow = (x: number, y: number, time: number) => {
			const dx = x - startX;
			const dy = y - startY;
			if (!decided) {
				if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return false;
				decided = true;
				const vertical = Math.abs(dy) > Math.abs(dx);
				const contentFirst =
					scroller !== null &&
					(dy > 0
						? scroller.scrollTop > 0
						: scroller.scrollTop + scroller.clientHeight <
							scroller.scrollHeight - 1);
				if (!vertical || contentFirst) return false;
				clearTimeout(closing);
				setHeight(el.offsetHeight);
				setDragging(true);
			}
			if (!dragging()) return false;
			setOffset(dy > 0 && canClose() ? dy : dy > 0 ? give(dy) : -give(-dy));
			samples.push([time, y]);
			while (samples.length > 2 && time - samples[0][0] > 100) samples.shift();
			return true;
		};

		const release = () => {
			if (!dragging()) return false;
			setDragging(false);
			const [first, last] = [samples[0], samples[samples.length - 1]];
			const speed =
				first && last && last[0] > first[0]
					? (last[1] - first[1]) / (last[0] - first[0])
					: 0;
			const pulled = offset();
			const closes =
				canClose() &&
				pulled > 0 &&
				(pulled > height() * CLOSE_AT || speed > FLICK);
			if (!closes) {
				setSettle(reduce.matches ? "none" : SETTLE);
				setOffset(0);
				closing = setTimeout(() => setSettle(undefined), SETTLE_MS);
				return true;
			}
			// On past the edge at the speed it was let go, then closed for real.
			const to = height() * 1.1;
			const ms = reduce.matches
				? 0
				: Math.min(320, Math.max(140, (to - pulled) / Math.max(speed, 1.4)));
			setSettle(`transform ${ms}ms cubic-bezier(0.2, 0.8, 0.4, 1)`);
			setOffset(to);
			closing = setTimeout(() => {
				close();
				setSettle(undefined);
				setOffset(0);
			}, ms);
			return true;
		};

		const onTouchStart = (e: TouchEvent) => {
			if (e.touches.length === 1)
				begin(e.touches[0].clientX, e.touches[0].clientY, e.target);
		};
		const onTouchMove = (e: TouchEvent) => {
			const touch = e.touches[0];
			if (follow(touch.clientX, touch.clientY, e.timeStamp)) e.preventDefault();
		};

		// A mouse drags it too. The click a mouse sends on letting go is swallowed after a drag, so it can't
		// land on whatever is under the pointer.
		const swallow = (e: Event) => {
			e.stopPropagation();
			e.preventDefault();
		};
		const onMouseMove = (e: PointerEvent) =>
			follow(e.clientX, e.clientY, e.timeStamp);
		const onMouseUp = () => {
			window.removeEventListener("pointermove", onMouseMove);
			window.removeEventListener("pointerup", onMouseUp);
			if (!release()) return;
			window.addEventListener("click", swallow, { capture: true, once: true });
			setTimeout(() => window.removeEventListener("click", swallow, true));
		};
		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType !== "mouse" || e.button !== 0) return;
			begin(e.clientX, e.clientY, e.target);
			window.addEventListener("pointermove", onMouseMove);
			window.addEventListener("pointerup", onMouseUp);
		};

		el.addEventListener("touchstart", onTouchStart, { passive: true });
		el.addEventListener("touchmove", onTouchMove, { passive: false });
		el.addEventListener("touchend", release);
		el.addEventListener("touchcancel", release);
		el.addEventListener("pointerdown", onPointerDown);
		onCleanup(() => {
			clearTimeout(closing);
			el.removeEventListener("touchstart", onTouchStart);
			el.removeEventListener("touchmove", onTouchMove);
			el.removeEventListener("touchend", release);
			el.removeEventListener("touchcancel", release);
			el.removeEventListener("pointerdown", onPointerDown);
			onMouseUp();
		});
	});

	return {
		offset,
		dragging,
		// The transition for the sheet's transform: none while it follows the finger, the release's own
		// afterwards, and the caller's for opening and closing otherwise.
		transition: (opening: string) =>
			dragging() ? "none" : (settle() ?? opening),
		// How far it has been pulled towards closed, 0 to 1, for a backdrop to fade with.
		pulled: () => Math.min(1, Math.max(0, offset() / height())),
	};
}
