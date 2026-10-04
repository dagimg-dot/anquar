// A key is the page's unless something else is using it: a modifier chord, a field being typed in, a sheet
// being worked in, or a dialog that has the screen.
const IN_USE_BY = "input, textarea, select, [contenteditable], [data-sheet]";
const OPEN_DIALOG = '[aria-modal="true"]:not([aria-hidden="true"])';

export function keyIsForPage(e: KeyboardEvent): boolean {
	if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return false;
	if (e.target instanceof Element && e.target.closest(IN_USE_BY)) return false;
	return !document.querySelector(OPEN_DIALOG);
}
