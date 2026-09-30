import { INK, lineAt } from "./brand/mark.ts";

// The splash takes over the first frame that index.html painted. On Android that frame is the phone's own
// splash, so it holds still while that fades; elsewhere the mark builds out of the core. While the app is
// still loading, the lines step up one anquar at a time, and every rest is the logo. Once the app says it's
// ready, the mark lands in the header's mark and the page rises in under it.

interface Box {
	x: number;
	y: number;
	s: number;
}

interface Boot {
	t0: number;
	entry: "hold" | "build";
	place: () => Box;
}

declare global {
	interface Window {
		__anquarSplash?: Boot;
	}
}

// seconds. hold: Android's splash fades over our first frame for about 0.26 s, so nothing moves before 0.3.
const T = {
	hold: 0.3,
	build: 0.64,
	step: 0.46,
	beat: 0.72,
	land: 0.56,
	fade: 0.22,
	giveUp: 6,
};

const SNAP = [0.23, 1, 0.32, 1] as const;
const BRAKE = [0.16, 1, 0.3, 1] as const;
const LAND = [0.3, 0, 0.1, 1] as const;
const css = (b: readonly number[]) => `cubic-bezier(${b.join(", ")})`;

let readyAt: number | null = null;

export function splashReady() {
	readyAt ??= performance.now();
}

function bezier([x1, y1, x2, y2]: readonly number[]) {
	const cx = 3 * x1;
	const bx = 3 * (x2 - x1) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * (y2 - y1) - cy;
	const ay = 1 - cy - by;
	const X = (t: number) => ((ax * t + bx) * t + cx) * t;
	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let lo = 0;
		let hi = 1;
		let t = x;
		for (let i = 0; i < 24; i++) {
			if (X(t) < x) lo = t;
			else hi = t;
			t = (lo + hi) / 2;
		}
		return ((ay * t + by) * t + cy) * t;
	};
}

const snap = bezier(SNAP);
const brake = bezier(BRAKE);
const land = bezier(LAND);
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
	const u = clamp((x - a) / (b - a));
	return u * u * (3 - 2 * u);
};

// The mark as a feed. Line j is born at the core when phi = j and rises a pitch per step, widening along the
// two edges, then dissolves above the top slot. At every whole phi >= 4 it is exactly the mark.
function stream(svg: SVGSVGElement) {
	svg.replaceChildren();
	const lines = Array.from({ length: 6 }, () => {
		const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
		l.setAttribute("stroke", "currentColor");
		l.setAttribute("stroke-width", "4");
		l.setAttribute("stroke-linecap", "round");
		svg.append(l);
		return l;
	});
	return (phi: number) => {
		let k = 0;
		for (let j = Math.floor(phi); j >= 0 && k < lines.length; j--) {
			const d = phi - j;
			if (d >= 5) break;
			const a = clamp(d / 0.6) * (1 - smooth(4, 4.8, d));
			if (a < 0.002) continue;
			const { x1, x2, y } = lineAt(d);
			const l = lines[k++];
			l.setAttribute("x1", `${x1}`);
			l.setAttribute("x2", `${x2}`);
			l.setAttribute("y1", `${y}`);
			l.setAttribute("y2", `${y}`);
			l.setAttribute("opacity", `${a}`);
			l.removeAttribute("visibility");
		}
		for (; k < lines.length; k++) lines[k].setAttribute("visibility", "hidden");
	};
}

function place(svg: SVGSVGElement, { x, y, s }: Box) {
	svg.style.width = svg.style.height = `${s}px`;
	svg.style.transform = `translate(${x}px, ${y}px)`;
}

// Everything marked data-splash-rise comes up the way the feed settles; "children" lifts each child in turn.
function rise() {
	const els: Element[] = [];
	for (const el of document.querySelectorAll("[data-splash-rise]"))
		els.push(
			...(el.getAttribute("data-splash-rise") === "children"
				? el.children
				: [el]),
		);
	els.forEach((el, i) => {
		el.animate(
			[
				{ opacity: 0, transform: "translateY(28px)" },
				{ opacity: 1, transform: "none" },
			],
			{
				duration: 440,
				delay: 200 + 50 * Math.min(i, 6),
				easing: css(SNAP),
				fill: "backwards",
			},
		);
	});
	for (const el of document.querySelectorAll("[data-splash-word]"))
		el.animate(
			[
				{ opacity: 0, transform: "translateX(-8px)" },
				{ opacity: 1, transform: "none" },
			],
			{ duration: 320, delay: 300, easing: css(BRAKE), fill: "backwards" },
		);
	// What's docked to the bottom edge slides up from below it with the mark's flight, and doesn't fade: a
	// half-transparent glass bar reads as dirty.
	[...document.querySelectorAll("[data-splash-slide]")].forEach((el, i) => {
		const below = innerHeight - el.getBoundingClientRect().top + 8;
		el.animate(
			[{ transform: `translateY(${below}px)` }, { transform: "none" }],
			{
				duration: T.land * 1000,
				delay: 100 + 40 * i,
				easing: css(BRAKE),
				fill: "backwards",
			},
		);
	});
}

function run(el: HTMLElement, boot: Boot) {
	const ground = el.firstElementChild as HTMLElement;
	const svg = el.lastElementChild as SVGSVGElement;
	const draw = stream(svg);
	const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
	const building = boot.entry === "build" && !reduce;

	// A build starts when there is something to draw it with; a hold is timed from our first paint, which is
	// when Android's splash starts to fade.
	const t0 = building ? performance.now() : boot.t0;
	const entryEnd = building ? T.build : T.hold;
	let base = 4;
	let stepFrom = -1;
	let nextStep = entryEnd;

	draw(building ? 0 : 4);
	svg.style.visibility = "visible";

	const tick = (now: number) => {
		const t = (now - t0) / 1000;
		if (t < entryEnd) {
			if (building) draw(4 * brake(t / entryEnd));
			return requestAnimationFrame(tick);
		}
		const ready = readyAt !== null || t > T.giveUp;
		if (stepFrom >= 0) {
			const u = (t - stepFrom) / T.step;
			if (u < 1) {
				draw(base + snap(u));
				return requestAnimationFrame(tick);
			}
			base += 1;
			draw(base);
			nextStep = stepFrom + T.beat;
			stepFrom = -1;
		}
		if (ready) return leave();
		if (!reduce && t >= nextStep) stepFrom = t;
		requestAnimationFrame(tick);
	};

	function leave() {
		removeEventListener("resize", boot.place);
		el.style.pointerEvents = "none";
		const target = document.querySelector<SVGElement>("[data-splash-land]");
		const to = target?.getBoundingClientRect();
		if (reduce || !target || !to?.width) {
			el.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: T.fade * 1000,
				fill: "forwards",
			}).finished.then(() => el.remove());
			return;
		}

		const from = boot.place();
		const end = { x: to.left, y: to.top, s: to.width };
		rise();
		target.style.visibility = "hidden";
		ground.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: 300,
			fill: "forwards",
		});
		svg.animate([{ color: INK }, { color: getComputedStyle(target).color }], {
			duration: T.land * 1000,
			easing: css(LAND),
			fill: "forwards",
		});

		const t1 = performance.now();
		const fly = (now: number) => {
			const x = (now - t1) / 1000;
			const u = land(x / T.land);
			place(svg, {
				x: from.x + (end.x - from.x) * u,
				y: from.y + (end.y - from.y) * u,
				s: from.s * (end.s / from.s) ** u,
			});
			if (x < T.land) return requestAnimationFrame(fly);
			target.style.visibility = "";
			el.remove();
		};
		requestAnimationFrame(fly);
	}

	requestAnimationFrame(tick);
}

const el = document.getElementById("splash");
const boot = window.__anquarSplash;
if (el && boot) run(el, boot);
