import { useNavigate } from "@solidjs/router";
import { CaretUp, Plus } from "phosphor-solid";
import { createSignal, For, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import toast from "solid-toast";
import { lineAt, MARK, markLines } from "../brand/mark";
import { BOOKS, type SampleBook } from "../landing/sample";
import { detent, flourish, tick } from "../lib/haptics";
import { pickBooks } from "../lib/imports";
import { finishOnboarding } from "../lib/onboarding";
import { readingGoal, setReadingGoal } from "../lib/reading";
import { bookPath } from "../lib/routes";
import { addStarter } from "../lib/starter";
import { splashGone, splashReady } from "../splash";

const PAGES = [
	{
		title: "Scroll a book.",
		text: "anquar lays a book out as a feed, a screen at a time. Swipe up, the way you'd scroll anything else.",
	},
	{
		title: "Every screen counts.",
		text: "Each screen you read is an anquar. Pick how many make your day; the mark fills as you go.",
	},
	{
		title: "Bring a book.",
		text: "Any EPUB without DRM. Add it here, or share it to anquar from your files. It never leaves this phone.",
	},
];

const GOALS = [10, 20, 30, 50];
// About 40 seconds a screen, near enough to put a time beside a goal.
const minutes = (goal: number) => {
	const m = (goal * 40) / 60;
	return m < 10 ? Math.round(m) : Math.round(m / 5) * 5;
};

// The stage is one set of rounded bars in a 300 × 330 box, and each drawing gives every bar a place: the
// mark's four lines, ten lines of a page, three books. Scrolling, the intro and the ending blend between them.
const W = 300;
const H = 330;
const S = 2.7;
const CX = 150;
const CY = 150;
const SW = MARK.stroke * S;
const CW = 84;
const CH = 126;
const FAN: { book: SampleBook; cx: number; cy: number; rot: number }[] = [
	{ book: BOOKS.meditations, cx: 150, cy: 150, rot: 0 },
	{ book: BOOKS.moby, cx: 90, cy: 164, rot: -10 },
	{ book: BOOKS.pride, cx: 210, cy: 164, rot: 10 },
];
// Drawn back to front, so the middle book, from the mark's top line, lies on top.
const ORDER = [4, 5, 6, 7, 8, 9, 3, 2, 1, 0];

interface Bar {
	cx: number;
	cy: number;
	w: number;
	h: number;
	rot: number;
}
// A line of the mark, k from the top, as long as the header's line with its round caps.
const markBar = (k: number, part = 1): Bar => {
	const { x1, x2, y } = lineAt(4 - Math.min(k, 3));
	return {
		cx: CX,
		cy: CY + (y - 40) * S,
		w: (x2 - x1) * S * part + SW,
		h: SW,
		rot: 0,
	};
};
const textBar = (k: number, shift: number): Bar => {
	const x2 = k === 3 ? 176 : k === 9 ? 196 : 230;
	return {
		cx: (70 + x2) / 2,
		cy: 52 + k * 24 + (k > 3 ? 14 : 0) + shift,
		w: x2 - 70,
		h: 6,
		rot: 0,
	};
};
const gone = (b: Bar): Bar => ({ ...b, w: 0, h: 0 });
const coverBar = (k: number): Bar =>
	k < 3
		? { cx: FAN[k].cx, cy: FAN[k].cy, w: CW, h: CH, rot: FAN[k].rot }
		: gone(markBar(3));

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const ease = (t: number) => {
	const x = clamp(t);
	return x * x * (3 - 2 * x);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp = (a: Bar, b: Bar, t: number): Bar => ({
	cx: mix(a.cx, b.cx, t),
	cy: mix(a.cy, b.cy, t),
	w: mix(a.w, b.w, t),
	h: mix(a.h, b.h, t),
	rot: mix(a.rot, b.rot, t),
});
const blend = (a: string, b: string, t: number) =>
	`color-mix(in oklab, ${a} ${Math.round((1 - t) * 100)}%, ${b})`;
const INK = "var(--ink)";
const BRAND = "var(--brand-500)";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
function tween(ms: number, step: (t: number) => void): Promise<void> {
	return new Promise((done) => {
		if (reduce) {
			step(1);
			return done();
		}
		const t0 = performance.now();
		const frame = (now: number) => {
			const t = clamp((now - t0) / ms);
			step(t);
			if (t < 1) requestAnimationFrame(frame);
			else done();
		};
		requestAnimationFrame(frame);
	});
}

// A title set in lines of about nine letters, as on the landing page's covers.
const titleLines = (title: string) =>
	title
		.replace(" and ", " and|")
		.split(/\s|\|/)
		.reduce<string[]>((lines, w) => {
			const last = lines.at(-1);
			if (last && `${last} ${w}`.length <= 9)
				lines[lines.length - 1] = `${last} ${w}`;
			else lines.push(w);
			return lines;
		}, []);

/**
 * Three pages for someone opening anquar with nothing in it, swiped like the feed: what it is, a daily goal, a
 * first book. One drawing runs through them, the mark opening into a page, folding back as the goal's meter
 * and growing into books, and on the way out it folds into the mark again and lands in the header.
 */
export default function Onboarding(props: { onDone: () => void }) {
	const navigate = useNavigate();
	const [goal, setGoal] = createSignal(readingGoal());
	const [leaving, setLeaving] = createSignal(false);
	let snap!: HTMLDivElement;
	let stage!: HTMLDivElement;
	let svg!: SVGSVGElement;
	let feed!: SVGGElement;
	let proxy!: SVGSVGElement;
	const bars: SVGGElement[] = [];
	const fills: SVGRectElement[] = [];
	const cards: SVGRectElement[] = [];
	const copies: HTMLDivElement[] = [];
	const acts: HTMLDivElement[] = [];
	const dots: HTMLElement[] = [];
	let intro = reduce ? 1 : 0;
	let meter = 0;
	let done = 0;
	let frame = 0;

	function draw() {
		frame = 0;
		const p = Math.min(2, Math.max(0, snap.scrollTop / snap.clientHeight));
		const shift = -ease(p) * 70;
		const open = ease(intro);
		bars.forEach((g, k) => {
			const extra = k > 3;
			const mark = extra ? gone(markBar(3)) : markBar(k);
			let geo: Bar;
			let fill: string;
			let op: number;
			if (p <= 1) {
				const t = ease(p);
				geo = lerp(lerp(mark, textBar(k, shift), open), mark, t);
				const startOp = extra ? 0.42 * open : mix(1, 0.42, open);
				fill = blend(blend(BRAND, INK, open), INK, t);
				op = mix(startOp, extra ? 0 : 0.16, t);
			} else {
				const t = ease(p - 1);
				geo = lerp(mark, coverBar(k), t);
				fill = k < 3 ? blend(INK, FAN[k].book.bg, t) : INK;
				op = extra ? 0 : k < 3 ? mix(0.16, 1, t) : 0.16 * (1 - t);
			}
			if (done > 0) {
				const t = ease(done);
				geo = lerp(geo, mark, t);
				fill = blend(fill, BRAND, t);
				op = extra ? op * (1 - t) : mix(op, 1, t);
			}
			g.setAttribute(
				"transform",
				`translate(${geo.cx} ${geo.cy}) rotate(${geo.rot})`,
			);
			const r = g.firstElementChild as SVGRectElement;
			r.setAttribute("x", String(-geo.w / 2));
			r.setAttribute("y", String(-geo.h / 2));
			r.setAttribute("width", String(Math.max(0, geo.w)));
			r.setAttribute("height", String(Math.max(0, geo.h)));
			r.setAttribute("rx", String(Math.min(geo.h / 2, 6)));
			r.style.fill = fill;
			g.style.opacity = String(op);
			const words = g.lastElementChild as SVGGElement;
			if (words !== r)
				words.style.opacity = String(
					ease((p - 1.6) / 0.4) * (1 - ease(done * 3)),
				);
		});
		const near = clamp(1 - Math.abs(p - 1) * 2.4) * (1 - done);
		fills.forEach((r, i) => {
			const d = i + 1;
			const part = clamp(4 * meter - (d - 1));
			const m = markBar(4 - d, part);
			r.setAttribute("x", String(CX - m.w / 2));
			r.setAttribute("y", String(m.cy - SW / 2));
			r.setAttribute("width", String(m.w));
			r.setAttribute("height", String(SW));
			r.setAttribute("rx", String(SW / 2));
			r.style.opacity = String(part > 0 ? near : 0);
		});
		const cardOp = open * (1 - ease(p * 1.4));
		cards[1].style.opacity = String(cardOp);
		cards[0].style.opacity = cards[2].style.opacity = String(cardOp * 0.5);
		feed.setAttribute("transform", `translate(0 ${shift})`);
		copies.forEach((c, i) => {
			const d = p - i;
			c.style.opacity = String(ease(1 - Math.abs(d) * 2.2));
			c.style.transform = `translateY(${-d * 34}px)`;
		});
		acts.forEach((c, i) => {
			const d = p - i;
			c.style.opacity = String(ease(1 - Math.abs(d) * 2.2));
			c.style.transform = `translateY(${-d * 50}px)`;
			c.toggleAttribute("data-live", Math.abs(d) < 0.2 && done === 0);
		});
		dots.forEach((dot, i) => {
			const on = ease(1 - Math.abs(p - i));
			dot.style.height = `${5 + 13 * on}px`;
			dot.style.background = blend(
				BRAND,
				`color-mix(in oklab, ${INK} 25%, transparent)`,
				1 - on,
			);
		});
	}
	const redraw = () => {
		if (!frame) frame = requestAnimationFrame(draw);
	};

	// Where the mark sits on screen: the stage scales its box to fit, centred.
	function markBox() {
		const r = svg.getBoundingClientRect();
		const k = Math.min(r.width / W, r.height / H);
		const ox = r.left + (r.width - W * k) / 2;
		const oy = r.top + (r.height - H * k) / 2;
		return {
			left: ox + (CX - 32 * S) * k,
			top: oy + (CY - 40 * S) * k,
			size: 64 * S * k,
		};
	}

	const fillMeter = () =>
		tween(1500, (t) => {
			meter = ease(t);
			draw();
		});

	onMount(() => {
		// The splash lands its mark on this stand-in, exactly over the stage's, then the stage takes over.
		const box = markBox();
		Object.assign(proxy.style, {
			left: `${box.left}px`,
			top: `${box.top}px`,
			width: `${box.size}px`,
			height: `${box.size}px`,
		});
		draw();
		snap.addEventListener("scroll", redraw, { passive: true });
		let page = 0;
		const settle = () => {
			const i = Math.round(snap.scrollTop / snap.clientHeight);
			if (i === page) return;
			page = i;
			detent();
			if (i === 1) {
				meter = 0;
				void fillMeter();
			}
		};
		if ("onscrollend" in window) snap.addEventListener("scrollend", settle);
		else {
			let wait: ReturnType<typeof setTimeout>;
			snap.addEventListener(
				"scroll",
				() => {
					clearTimeout(wait);
					wait = setTimeout(settle, 90);
				},
				{ passive: true },
			);
		}
		splashReady();
		void splashGone.then(() => {
			stage.style.opacity = "1";
			setTimeout(
				() =>
					void tween(900, (t) => {
						intro = t;
						draw();
					}),
				250,
			);
		});
	});

	function pick(g: number) {
		tick();
		setGoal(g);
		setReadingGoal(g);
		meter = 0;
		void fillMeter();
	}

	let finishing = false;
	// The books fold back into the mark, which flies to the header's as the pages lift away.
	async function finish() {
		if (finishing) return;
		finishing = true;
		finishOnboarding();
		await tween(620, (t) => {
			done = t;
			draw();
		});
		flourish();
		const header = document.querySelector<SVGElement>(
			"header [data-splash-land]",
		);
		const from = markBox();
		setLeaving(true);
		if (header && !reduce) {
			const to = header.getBoundingClientRect();
			const fly = proxy.cloneNode(true) as SVGSVGElement;
			fly.removeAttribute("data-splash-land");
			Object.assign(fly.style, {
				position: "fixed",
				zIndex: "80",
				opacity: "1",
				left: `${from.left}px`,
				top: `${from.top}px`,
				width: `${from.size}px`,
				height: `${from.size}px`,
				transformOrigin: "0 0",
			});
			document.body.append(fly);
			svg.style.visibility = "hidden";
			header.style.visibility = "hidden";
			await fly.animate(
				[
					{ transform: "none" },
					{
						transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.size})`,
					},
				],
				{
					duration: 560,
					easing: "cubic-bezier(0.3, 0, 0.1, 1)",
					fill: "forwards",
				},
			).finished;
			header.style.visibility = "";
			fly.remove();
		}
		props.onDone();
	}

	function addBook() {
		pickBooks();
		void finish();
	}

	async function startWithMeditations() {
		const adding = addStarter();
		await finish();
		try {
			navigate(bookPath(await adding));
		} catch {
			toast.error(
				"Couldn't get Meditations. Check your connection, or add a book of your own.",
			);
		}
	}

	return (
		<Portal>
			<div
				class="onboarding fixed inset-0 z-[70] select-none overflow-hidden bg-canvas text-ink transition-[opacity,transform] duration-[450ms] ease-[cubic-bezier(0.3,0,0.1,1)]"
				classList={{
					"pointer-events-none -translate-y-5 opacity-0": leaving(),
				}}
			>
				<div class="pointer-events-none absolute top-1/2 right-3.5 z-[3] flex -translate-y-1/2 flex-col items-center gap-[7px]">
					<For each={PAGES}>
						{(_, i) => (
							<i
								class="block w-[5px] rounded-full"
								ref={(el) => {
									dots[i()] = el;
								}}
							/>
						)}
					</For>
				</div>

				<div
					class="onboarding-stage pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+196px)] bottom-[calc(env(safe-area-inset-bottom)+152px)] opacity-0"
					ref={stage}
				>
					<svg
						aria-hidden="true"
						class="h-full w-full overflow-visible"
						ref={svg}
						viewBox={`0 0 ${W} ${H}`}
					>
						<g ref={feed}>
							<For each={[-316, 15, 346]}>
								{(y, i) => (
									<rect
										class="fill-surface stroke-border"
										height="300"
										ref={(el) => {
											cards[i()] = el;
										}}
										rx="26"
										stroke-width="1.5"
										width="212"
										x="44"
										y={y}
									/>
								)}
							</For>
						</g>
						<For each={ORDER}>
							{(k) => (
								<g
									ref={(el) => {
										bars[k] = el;
									}}
								>
									<rect />
									{k < 3 && <CoverWords book={FAN[k].book} />}
								</g>
							)}
						</For>
						<g>
							<For each={[1, 2, 3, 4]}>
								{(_, i) => (
									<rect
										class="fill-brand-500"
										ref={(el) => {
											fills[i()] = el;
										}}
									/>
								)}
							</For>
						</g>
					</svg>
				</div>
				<svg
					aria-hidden="true"
					class="pointer-events-none absolute text-brand-500 opacity-0"
					data-splash-land="onboarding"
					fill="none"
					ref={proxy}
					stroke="currentColor"
					stroke-linecap="round"
					stroke-width={MARK.stroke}
					viewBox="0 0 64 64"
				>
					{markLines().map((l) => (
						<line x1={l.x1} x2={l.x2} y1={l.y} y2={l.y} />
					))}
				</svg>

				<div
					class="absolute inset-0 snap-y snap-mandatory overflow-y-auto overscroll-contain"
					ref={snap}
				>
					<For each={PAGES}>
						{() => <section class="h-full snap-start snap-always" />}
					</For>
				</div>

				<div class="pointer-events-none absolute inset-0 z-[2]">
					<For each={PAGES}>
						{(page, i) => (
							<div
								class="absolute inset-x-6 top-[calc(env(safe-area-inset-top)+62px)]"
								ref={(el) => {
									copies[i()] = el;
								}}
							>
								<h2 class="text-balance font-medium font-read text-[clamp(34px,10.5vw,46px)] leading-[1.02] tracking-[-0.028em]">
									{page.title}
								</h2>
								<p class="mt-3.5 max-w-[30ch] text-pretty text-[16px] text-ink-soft leading-normal">
									{page.text}
								</p>
							</div>
						)}
					</For>

					<div
						class={ACT}
						ref={(el) => {
							acts[0] = el;
						}}
					>
						<div class="flex flex-col items-center gap-0.5 pb-3 font-semibold text-[13px] text-ink-soft">
							<CaretUp class="onboarding-nudge" size={20} weight="bold" />
							Swipe up
						</div>
					</div>
					<div
						class={ACT}
						ref={(el) => {
							acts[1] = el;
						}}
					>
						<div class="flex gap-2">
							<For each={GOALS}>
								{(g) => (
									<button
										class="h-[46px] flex-1 rounded-[14px] border font-semibold text-[16px] tabular-nums transition-[background-color,border-color,color,transform] duration-200 active:scale-95"
										classList={{
											"border-brand-500 bg-brand-500/13 text-brand-500":
												goal() === g,
											"border-border bg-surface text-ink-soft": goal() !== g,
										}}
										onClick={() => pick(g)}
										type="button"
									>
										{g}
									</button>
								)}
							</For>
						</div>
						<div class="mt-2.5 text-[13px] text-ink-muted tabular-nums">
							about {minutes(goal())} minutes a day
						</div>
					</div>
					<div
						class={ACT}
						ref={(el) => {
							acts[2] = el;
						}}
					>
						<button
							class="flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-brand-500 font-semibold text-[16px] text-canvas transition-transform duration-200 active:scale-[0.97]"
							onClick={addBook}
							type="button"
						>
							<Plus size={19} weight="bold" />
							Add an EPUB
						</button>
						<button
							class="mt-1 h-[46px] w-full font-semibold text-[15px] text-ink-soft"
							onClick={() => void startWithMeditations()}
							type="button"
						>
							Start with Meditations
						</button>
					</div>
				</div>
			</div>
		</Portal>
	);
}

const ACT =
	"absolute inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+24px)]";

function CoverWords(props: { book: SampleBook }) {
	return (
		<g style={{ opacity: 0 }}>
			<For each={titleLines(props.book.title)}>
				{(line, i) => (
					<text
						class="font-medium font-read"
						fill={props.book.ink}
						font-size="13"
						x={-CW / 2 + 9}
						y={-CH / 2 + 22 + i() * 14}
					>
						{line}
					</text>
				)}
			</For>
			<text
				class="font-bold font-sans tracking-[0.1em]"
				fill={props.book.ink}
				font-size="5.6"
				opacity="0.75"
				x={-CW / 2 + 9}
				y={CH / 2 - 11}
			>
				{props.book.author.toUpperCase()}
			</text>
		</g>
	);
}
