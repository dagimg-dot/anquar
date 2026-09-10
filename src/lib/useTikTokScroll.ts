import { createEffect, onCleanup } from "solid-js";

export function useTikTokScroll(ref: () => HTMLElement | undefined) {
	// An effect, not onMount: the scroll container is behind a <Show> that
	// only resolves once the book has loaded from IndexedDB.
	createEffect(() => {
		const el = ref();
		if (!el) {
			return;
		}

		// Re-bound after the guard so the nested handlers see a non-null element.
		const container = el;

		let isAnimating = false;
		let touchStartY = 0;
		let touchStartTime = 0;

		function getPageHeight(): number {
			return window.innerHeight;
		}

		function getCurrentIndex(): number {
			return Math.round(container.scrollTop / getPageHeight());
		}

		function scrollToPage(index: number) {
			const maxIndex = Math.max(
				0,
				Math.ceil(container.scrollHeight / getPageHeight()) - 1,
			);
			const target = Math.max(0, Math.min(maxIndex, index));
			if (target === getCurrentIndex()) {
				return;
			}

			isAnimating = true;
			container.style.scrollSnapType = "none";
			container.scrollTo({ top: target * getPageHeight(), behavior: "smooth" });

			const onScrollEnd = () => {
				container.style.scrollSnapType = "";
				isAnimating = false;
				container.removeEventListener("scrollend", onScrollEnd);
			};
			container.addEventListener("scrollend", onScrollEnd, { once: true });

			setTimeout(() => {
				if (isAnimating) {
					container.style.scrollSnapType = "";
					isAnimating = false;
				}
			}, 500);
		}

		function onWheel(e: WheelEvent) {
			if (isAnimating) {
				e.preventDefault();
				return;
			}

			const direction = e.deltaY > 0 ? 1 : -1;
			const nextIndex = getCurrentIndex() + direction;
			const maxIndex = Math.max(
				0,
				Math.ceil(container.scrollHeight / getPageHeight()) - 1,
			);
			if (nextIndex < 0 || nextIndex > maxIndex) {
				return;
			}

			e.preventDefault();
			scrollToPage(nextIndex);
		}

		function onTouchStart(e: TouchEvent) {
			touchStartY = e.touches[0].clientY;
			touchStartTime = Date.now();
		}

		function onTouchEnd(e: TouchEvent) {
			if (isAnimating) {
				return;
			}

			const touchEndY = e.changedTouches[0].clientY;
			const dy = touchStartY - touchEndY;
			const dt = Date.now() - touchStartTime;
			const velocity = Math.abs(dy) / dt;
			const SWIPE_THRESHOLD = 30;
			const VELOCITY_THRESHOLD = 0.3;

			if (Math.abs(dy) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
				const direction = dy > 0 ? 1 : -1;
				scrollToPage(getCurrentIndex() + direction);
			}
		}

		container.addEventListener("wheel", onWheel, { passive: false });
		container.addEventListener("touchstart", onTouchStart, { passive: true });
		container.addEventListener("touchend", onTouchEnd, { passive: true });

		onCleanup(() => {
			container.removeEventListener("wheel", onWheel);
			container.removeEventListener("touchstart", onTouchStart);
			container.removeEventListener("touchend", onTouchEnd);
		});
	});
}
