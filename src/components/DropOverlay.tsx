import { FilePlus } from "phosphor-solid";
import { Show } from "solid-js";
import { dropping } from "../lib/drop-books";

// Over the window while files are dragged across it, so it's clear that letting go adds them.
export default function DropOverlay() {
	return (
		<Show when={dropping()}>
			<div class="pointer-events-none fixed inset-0 z-[80] grid place-items-center bg-canvas/80 backdrop-blur-sm">
				<div class="m-6 flex flex-col items-center gap-3 rounded-3xl border-2 border-brand-500 border-dashed px-14 py-12 text-center">
					<FilePlus class="text-brand-500" size={44} weight="fill" />
					<div class="font-semibold text-ink text-lg">Drop to add</div>
					<div class="text-ink-soft text-sm">
						EPUBs go straight to your library
					</div>
				</div>
			</div>
		</Show>
	);
}
