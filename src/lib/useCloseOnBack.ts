import { createEffect, onCleanup } from "solid-js";

interface CloseWatcher {
	onclose: (() => void) | null;
	destroy(): void;
}
declare const CloseWatcher: { new (): CloseWatcher } | undefined;

// The Android back gesture, and Esc, close an open sheet as they would a native one instead of leaving the
// screen. CloseWatcher is Chromium's; without it back keeps its usual meaning.
export function useCloseOnBack(open: () => boolean, close: () => void) {
	if (typeof CloseWatcher === "undefined") return;
	const Watcher = CloseWatcher;
	let watcher: CloseWatcher | undefined;

	const arm = () => {
		watcher = new Watcher();
		watcher.onclose = () => {
			watcher = undefined;
			close();
			// A sheet that stays open (an import being cancelled) still needs back to work next time.
			if (open()) arm();
		};
	};

	createEffect(() => {
		if (open()) {
			if (!watcher) arm();
		} else {
			watcher?.destroy();
			watcher = undefined;
		}
	});
	onCleanup(() => watcher?.destroy());
}
