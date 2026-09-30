// The mark: four lines in a 64-unit box, each 12 units shorter than the one above, so their ends run to
// one point a pitch below the last line, the core. The header, the icons and the splash all draw it from here.
export const MARK = {
	cx: 32,
	core: 64,
	top: 16,
	halfTop: 24,
	stroke: 4,
	lines: 4,
} as const;

// The dark theme's canvas and brand-500 (index.css) in hex, for the places that can't take oklch: the
// manifest, the icons and the Android splash.
export const GROUND = "#0B1210";
export const INK = "#48DE81";

export interface MarkLine {
	x1: number;
	x2: number;
	y: number;
}

// A line d pitches above the core. The top line and the core stay put whatever the count, so three lines
// is the same triangle cut coarser.
export function lineAt(d: number, lines: number = MARK.lines): MarkLine {
	const pitch = (MARK.core - MARK.top) / lines;
	const half = (MARK.halfTop / lines) * d;
	return { x1: MARK.cx - half, x2: MARK.cx + half, y: MARK.core - pitch * d };
}

export function markLines(lines: number = MARK.lines): MarkLine[] {
	return Array.from({ length: lines }, (_, i) => lineAt(lines - i, lines));
}

export function markSvgLines(stroke: number = MARK.stroke): string {
	const lines = markLines()
		.map((l) => `<line x1="${l.x1}" y1="${l.y}" x2="${l.x2}" y2="${l.y}"/>`)
		.join("");
	return `<g fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round">${lines}</g>`;
}

// The maskable icon is the 64-box drawn MASKABLE_BOX units wide on a 1024 canvas. Chrome's WebAPK draws that
// one image for the launcher and both Android splashes, SPLASH_CANVAS_DP wide on the Nothing A059, and the
// splash's first frame copies it. Recorded there on 2026-09-30, Android's mark and ours differ by under a pixel.
export const MASKABLE_BOX = 541.5;
export const SPLASH_CANVAS_DP = 274.6;
export const SPLASH_BOX = (MASKABLE_BOX / 1024) * SPLASH_CANVAS_DP;
