import {
	createEffect,
	createSignal,
	type JSX,
	on,
	onCleanup,
	Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import {
	FRAME,
	MOVE,
	opacityOf,
	placementFor,
	pose,
	SHEET_MOVE,
	SLIDE_MS,
} from "../lib/sheet-placement";
import { useCloseOnBack } from "../lib/useCloseOnBack";
import { useSheetDrag } from "../lib/useSheetDrag";

interface BottomSheetProps {
	children: JSX.Element;
	// Dims what's behind, for a sheet that is a task of its own rather than a control over the page. From
	// tablet up a sheet that isn't a panel is a dialog, which always dims.
	dim?: boolean;
	onClose: () => void;
	open: boolean;
	// From tablet up, a panel at the right of the page it changes instead of a dialog. Reader controls are.
	panel?: boolean;
	title: string;
}

/**
 * A non-modal sheet: nothing dims behind it, because these controls change the
 * page the reader is looking at and they need to see it happen. The catcher is
 * transparent for that reason — it takes the outside tap without taking the view.
 *
 * It lives on the body, not where it's used: a tab fades in with a transform, and
 * a transformed ancestor would hold a closed sheet to the tab's bottom instead of
 * the screen's, flashing it up for as long as the fade runs.
 *
 * Where it appears depends on the screen (lib/sheet-placement.ts): a bottom sheet you can drag away on a
 * phone, a dialog or a side panel from tablet up.
 */
export default function BottomSheet(props: BottomSheetProps) {
	const [sheet, setSheet] = createSignal<HTMLDivElement>();
	const placement = () => placementFor(props.panel ?? false);
	const dims = () => props.dim || placement() === "dialog";
	useCloseOnBack(
		() => props.open,
		() => props.onClose(),
	);
	// Only the phone's sheet is dragged away.
	const drag = useSheetDrag(
		() => (placement() === "sheet" ? sheet() : undefined),
		() => props.onClose(),
	);

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
		<Portal>
			{/* A panel leaves the page beside it live, so it has no catcher: its close button and Esc end it. */}
			<Show when={placement() !== "panel"}>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: dismiss target, not a control */}
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape and back close the sheet too */}
				<div
					class="fixed inset-0 z-[60] transition-opacity duration-300"
					classList={{
						"bg-black/50": dims(),
						"pointer-events-none opacity-0": !props.open,
					}}
					onClick={props.onClose}
					style={
						props.open && dims() && placement() === "sheet"
							? {
									opacity: 1 - drag.pulled(),
									transition: drag.dragging() ? "none" : undefined,
								}
							: undefined
					}
				/>
			</Show>

			<div
				aria-hidden={!props.open}
				aria-label={props.title}
				aria-modal={dims() && placement() !== "sheet" ? true : undefined}
				class={`fixed z-[61] select-none bg-canvas ${FRAME[placement()]}`}
				classList={{ "pointer-events-none": !props.open }}
				data-sheet
				onClick={(e) => e.stopPropagation()}
				ref={setSheet}
				role="dialog"
				style={{
					opacity: opacityOf(placement(), props.open),
					transform: pose(placement(), props.open, drag.offset()),
					transition:
						placement() === "sheet"
							? drag.transition(SHEET_MOVE)
							: MOVE[placement() as "dialog" | "panel"],
					"padding-bottom": "max(1.25rem, env(safe-area-inset-bottom))",
				}}
			>
				<Show when={placement() === "sheet"}>
					<div class="flex justify-center pt-2.5 pb-1">
						<div class="h-[5px] w-9 rounded-full bg-ink-muted/50" />
					</div>
				</Show>

				<div
					class="flex items-center justify-between px-5 pb-3"
					classList={{
						"pt-1": placement() === "sheet",
						"pt-5": placement() !== "sheet",
					}}
				>
					<h2 class="font-semibold text-[17px] text-ink tracking-[-0.01em]">
						{props.title}
					</h2>
					<button
						aria-label={`Close ${props.title}`}
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
					<div
						class="overflow-y-auto overscroll-contain px-5"
						classList={{
							"max-h-[70dvh]": placement() !== "panel",
							"min-h-0 flex-1": placement() === "panel",
						}}
					>
						{props.children}
					</div>
				</Show>
			</div>
		</Portal>
	);
}
