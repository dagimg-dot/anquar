import { isTablet } from "./layout";

/**
 * Where a sheet appears. On a phone it slides up from the bottom. From tablet up a task (adding a book, a
 * save's options) is a dialog in the middle of a dimmed window, and the reader's controls are a panel at
 * the right, beside the page they change.
 */
export type Placement = "sheet" | "dialog" | "panel";

export const placementFor = (panel: boolean): Placement =>
	!isTablet() ? "sheet" : panel ? "panel" : "dialog";

/** Position and shape; the sheet's own colours and padding are its own. */
export const FRAME: Record<Placement, string> = {
	sheet:
		"inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-[1.25rem] shadow-[0_-8px_40px_rgba(0,0,0,0.18)] after:absolute after:inset-x-0 after:top-full after:h-24 after:bg-[inherit]",
	dialog:
		"top-1/2 left-1/2 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border shadow-[0_30px_80px_rgba(0,0,0,0.5)]",
	panel:
		"top-4 right-24 bottom-4 flex w-[22.5rem] flex-col rounded-3xl border border-border shadow-[0_24px_60px_rgba(0,0,0,0.4)]",
};

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
export const SLIDE_MS = 400;

/** How a sheet moves between its two places: the sheet's own slide is the one a drag can interrupt. */
export const MOVE: Record<Exclude<Placement, "sheet">, string> = {
	dialog: `transform 260ms ${EASE}, opacity 200ms ease-out`,
	panel: `transform ${SLIDE_MS}ms ${EASE}`,
};
export const SHEET_MOVE = `transform ${SLIDE_MS}ms ${EASE}`;

/** Where it stands: open (a sheet offset by a drag), or out of sight, back where it came from. */
export function pose(placement: Placement, open: boolean, pull = 0): string {
	if (placement === "sheet")
		return open ? `translateY(${pull}px)` : "translateY(calc(100% + 3.5rem))";
	if (placement === "panel")
		// Far enough that its shadow goes too.
		return open ? "none" : "translateX(calc(100% + 14rem))";
	return open ? "none" : "scale(0.96)";
}

/** A dialog fades; the others only move. */
export const opacityOf = (placement: Placement, open: boolean) =>
	placement === "dialog" && !open ? 0 : 1;
