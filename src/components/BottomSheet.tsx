import {
	createEffect,
	createSignal,
	type JSX,
	on,
	onCleanup,
	Show,
} from "solid-js";
import { useCloseOnBack } from "../lib/useCloseOnBack";
import { useSheetDrag } from "../lib/useSheetDrag";

const SLIDE_MS = 400;

interface BottomSheetProps {
	children: JSX.Element;
	onClose: () => void;
	open: boolean;
	title: string;
}

/**
 * A non-modal sheet: nothing dims behind it, because these controls change the
 * page the reader is looking at and they need to see it happen. The catcher is
 * transparent for that reason — it takes the outside tap without taking the view.
 */
export default function BottomSheet(props: BottomSheetProps) {
	const [sheet, setSheet] = createSignal<HTMLDivElement>();
	useCloseOnBack(
		() => props.open,
		() => props.onClose(),
	);
	const drag = useSheetDrag(sheet, () => props.onClose());

	// The content stays until the sheet has slid off, so it leaves whole, the way it arrived.
	const [shown, setShown] = createSignal(props.open);
	createEffect(
		on(
			() => props.open,
			(open) => {
				if (open) return setShown(true);
				const gone = setTimeout(() => setShown(false), SLIDE_MS);
				onCleanup(() => clearTimeout(gone));
			},
		),
	);

	return (
		<>
			<Show when={props.open}>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: dismiss target, not a control */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape is handled by the sheet's owner */}
				<div class="fixed inset-0 z-40" onClick={props.onClose} />
			</Show>

			<div
				aria-hidden={!props.open}
				class="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg select-none rounded-t-[1.25rem] bg-canvas shadow-[0_-8px_40px_rgba(0,0,0,0.18)] after:absolute after:inset-x-0 after:top-full after:h-24 after:bg-canvas"
				classList={{ "pointer-events-none": !props.open }}
				onClick={(e) => e.stopPropagation()}
				ref={setSheet}
				style={{
					transform: props.open
						? `translateY(${drag.offset()}px)`
						: "translateY(110%)",
					transition: drag.transition(
						`transform ${SLIDE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
					),
					"padding-bottom": "max(1.25rem, env(safe-area-inset-bottom))",
				}}
			>
				<div class="flex justify-center pt-2.5 pb-1">
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

				<Show when={shown()}>
					<div class="max-h-[70dvh] overflow-y-auto overscroll-contain px-5">
						{props.children}
					</div>
				</Show>
			</div>
		</>
	);
}
