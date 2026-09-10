import { createSignal, type JSX, Show } from "solid-js";

interface BottomSheetProps {
	children: JSX.Element;
	onClose: () => void;
	open: boolean;
	title: string;
}

const DISMISS_DISTANCE = 90;

/**
 * A non-modal sheet: nothing dims behind it, because these controls change the
 * page the reader is looking at and they need to see it happen.
 */
export default function BottomSheet(props: BottomSheetProps) {
	const [drag, setDrag] = createSignal(0);
	let startY = 0;

	function onTouchStart(e: TouchEvent) {
		startY = e.touches[0].clientY;
	}

	function onTouchMove(e: TouchEvent) {
		// Downward only — dragging up must not tear the sheet off its edge.
		setDrag(Math.max(0, e.touches[0].clientY - startY));
	}

	function onTouchEnd() {
		if (drag() > DISMISS_DISTANCE) props.onClose();
		setDrag(0);
	}

	return (
		<div
			aria-hidden={!props.open}
			class="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg select-none rounded-t-[1.25rem] bg-canvas shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
			classList={{
				"pointer-events-none": !props.open,
				"transition-transform duration-[400ms] ease-[cubic-bezier(0.32,0.72,0,1)]":
					drag() === 0,
			}}
			onClick={(e) => e.stopPropagation()}
			style={{
				transform: props.open ? `translateY(${drag()}px)` : "translateY(110%)",
				"padding-bottom": "max(1.25rem, env(safe-area-inset-bottom))",
			}}
		>
			<div
				class="flex justify-center pt-2.5 pb-1"
				onTouchEnd={onTouchEnd}
				onTouchMove={onTouchMove}
				onTouchStart={onTouchStart}
			>
				<div class="h-[5px] w-9 rounded-full bg-ink-muted/50" />
			</div>

			<div class="flex items-center justify-between px-5 pt-1 pb-3">
				<h2 class="font-semibold text-[17px] text-ink tracking-[-0.01em]">
					{props.title}
				</h2>
				<button
					aria-label="Close settings"
					class="flex h-7 w-7 items-center justify-center rounded-full bg-surface-elevated text-ink-soft transition-transform active:scale-90"
					onClick={props.onClose}
					type="button"
				>
					<svg
						class="h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2.5"
						aria-hidden="true"
					>
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>
			</div>

			<Show when={props.open}>
				<div class="max-h-[70dvh] overflow-y-auto overscroll-contain px-5">
					{props.children}
				</div>
			</Show>
		</div>
	);
}
