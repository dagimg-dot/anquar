import { createEffect, onCleanup } from "solid-js";

// The phone's own timeout takes over again after this long without a scroll or a tap.
const IDLE_MS = 5 * 60_000;

// Keeps the screen on while you read, for as long as you keep turning cards. The lock is dropped by the
// system whenever the app is hidden, and taken again on the next sign of reading.
export function useScreenAwake(feed: () => HTMLElement | undefined) {
	if (!("wakeLock" in navigator)) return;
	let lock: WakeLockSentinel | undefined;
	let asking = false;
	let idle: ReturnType<typeof setTimeout> | undefined;

	const release = () => {
		clearTimeout(idle);
		void lock?.release();
		lock = undefined;
	};

	const stayAwake = async () => {
		clearTimeout(idle);
		idle = setTimeout(release, IDLE_MS);
		if (lock || asking || document.hidden) return;
		asking = true;
		try {
			lock = await navigator.wakeLock.request("screen");
			lock.addEventListener("release", () => {
				lock = undefined;
			});
		} catch {
			// Refused, for one by battery saver: the screen simply keeps its usual timeout.
		} finally {
			asking = false;
		}
	};

	createEffect(() => {
		const el = feed();
		if (!el) return;
		const onVisible = () => !document.hidden && void stayAwake();
		el.addEventListener("scroll", stayAwake, { passive: true });
		el.addEventListener("pointerdown", stayAwake, { passive: true });
		document.addEventListener("visibilitychange", onVisible);
		void stayAwake();
		onCleanup(() => {
			el.removeEventListener("scroll", stayAwake);
			el.removeEventListener("pointerdown", stayAwake);
			document.removeEventListener("visibilitychange", onVisible);
			release();
		});
	});
}
