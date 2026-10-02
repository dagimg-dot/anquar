import { lineAt, MARK } from "../brand/mark.ts";

const LINES = [1, 2, 3, 4].map((d) => ({ d, ...lineAt(d) }));
const reducedMotion = () =>
	matchMedia("(prefers-reduced-motion: reduce)").matches;

// MarkMeter in plain SVG: each line is a quarter of the goal, filled from the core outward.
export function meterSVG({
	stroke = MARK.stroke,
	rest = false,
}: {
	stroke?: number;
	rest?: boolean;
} = {}) {
	const track = rest
		? "color-mix(in oklab, var(--ice) 25%, transparent)"
		: "color-mix(in oklab, var(--ink) 15%, transparent)";
	const fill = rest ? "var(--ice)" : "var(--brand-500)";
	const lines = LINES.map(
		(l) =>
			`<line style="stroke:${track}" x1="${l.x1}" x2="${l.x2}" y1="${l.y}" y2="${l.y}"/><line class="m-fill" data-d="${l.d}" style="stroke:${fill}" x1="${MARK.cx}" x2="${MARK.cx}" y1="${l.y}" y2="${l.y}" visibility="hidden"/>`,
	).join("");
	return `<svg viewBox="0 0 64 64" fill="none" stroke-linecap="round" stroke-width="${stroke}" overflow="visible" aria-hidden="true">${lines}</svg>`;
}

export function drawMeter(svg: SVGSVGElement, fill: number) {
	for (const line of svg.querySelectorAll<SVGLineElement>(".m-fill")) {
		const d = Number(line.dataset.d);
		const part = Math.min(1, Math.max(0, 4 * fill - (d - 1)));
		const half = (MARK.halfTop / MARK.lines) * d * part;
		line.setAttribute("x1", String(MARK.cx - half));
		line.setAttribute("x2", String(MARK.cx + half));
		line.setAttribute("visibility", part > 0 ? "visible" : "hidden");
	}
	svg.dataset.fill = String(fill);
}

export function tweenMeter(svg: SVGSVGElement, to: number, ms = 700) {
	const from = Number(svg.dataset.fill ?? 0);
	if (reducedMotion() || from === to) return drawMeter(svg, to);
	const start = performance.now();
	const step = (now: number) => {
		const k = Math.min(1, (now - start) / ms);
		drawMeter(svg, from + (to - from) * (1 - (1 - k) ** 3));
		if (k < 1) requestAnimationFrame(step);
	};
	requestAnimationFrame(step);
}
