/**
 * Tapping a control collapses the selection before its click handler runs, so
 * callers have to snapshot on pointerdown — this only reads what is there now.
 */
export function readSelection(within?: HTMLElement): string {
	const sel = document.getSelection();
	if (!sel || sel.isCollapsed || sel.rangeCount === 0) return "";
	if (within && !within.contains(sel.getRangeAt(0).commonAncestorContainer)) {
		return "";
	}
	return sel.toString().trim();
}
