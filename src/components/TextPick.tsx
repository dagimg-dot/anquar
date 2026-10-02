import { BookmarkSimple, Copy, Export, Lightbulb } from "phosphor-solid";
import {
	createEffect,
	createSignal,
	type JSX,
	on,
	onCleanup,
	Show,
} from "solid-js";
import toast from "solid-toast";
import { detent, tick } from "../lib/haptics.ts";
import { PageText, span, type Word } from "../lib/text-pick.ts";

const HOLD_MS = 380;
const SLOP = 8;
const HIGHLIGHT = "pick";
/** How far a handle reaches past the line it marks: its knob and the rest of its hit box. */
const REACH = 30;

type Side = "end" | "start";

interface Pick {
	end: number;
	page: PageText;
	start: number;
}

interface Press {
	anchor?: Word;
	card: HTMLElement | null;
	/** A pick was already up, so a tap is about the pick, not the page. */
	held: boolean;
	moved: boolean;
	page?: PageText;
	timer?: ReturnType<typeof setTimeout>;
	x: number;
	y: number;
}

interface TextPickProps {
	accent: string;
	container: HTMLElement | undefined;
	ink: string;
	isSaved: (passage: string) => boolean;
	/** Read for its changes only: another card, a new layout or a sheet lets the pick go. */
	letGo: unknown;
	onExplain: (passage: string) => void;
	onSave: (passage: string) => void;
	onShare: (passage: string) => void;
	paper: string;
}

/** Runs at most once a frame with the latest of what it was given; `flush` runs a waiting one now. */
function perFrame<T>(run: (arg: T) => void) {
	let frame = 0;
	let latest: T;
	const call = (arg: T) => {
		latest = arg;
		frame ||= requestAnimationFrame(() => {
			frame = 0;
			run(latest);
		});
	};
	call.flush = () => {
		if (!frame) return;
		cancelAnimationFrame(frame);
		frame = 0;
		run(latest);
	};
	return call;
}

/**
 * The word under a point, looked up through the handles: a dragged one sits right where the finger points.
 * Only the lookup goes through them; the touch itself stays with the handle that has it.
 */
function wordAt(page: PageText, x: number, y: number): Word | undefined {
	const handles = document.querySelectorAll<HTMLElement>(".pick-handle");
	for (const h of handles) h.style.pointerEvents = "none";
	try {
		const at = page.offsetAt(x, y);
		return at === undefined ? undefined : page.wordNear(at);
	} finally {
		for (const h of handles) h.style.pointerEvents = "";
	}
}

/**
 * Hold a word to pick it and slide to take more, a word at a time; the handles snap to words and stay on the
 * card. Lifting the finger opens a pill above the pick with what you can do with it.
 */
export default function TextPick(props: TextPickProps) {
	const [pick, setPick] = createSignal<Pick>();
	const [lines, setLines] = createSignal<{ first: DOMRect; last: DOMRect }>();
	const [menuShown, setMenuShown] = createSignal(false);
	const [menuAt, setMenuAt] = createSignal({ x: 0, y: 0 });
	// A handle being dragged rides under the finger while the pick snaps to words, and settles on the word's
	// edge when it's let go. Otherwise handles glide from word to word, except while the page scrolls.
	const [follow, setFollow] = createSignal<{
		side: Side;
		x: number;
		y: number;
	}>();
	const [glide, setGlide] = createSignal(true);
	let menu: HTMLDivElement | undefined;

	const passage = () => {
		const p = pick();
		return p ? p.page.text.slice(p.start, p.end).trim() : "";
	};

	function choose(next: Pick | undefined) {
		const before = pick();
		if (
			next &&
			before &&
			next.page === before.page &&
			next.start === before.start &&
			next.end === before.end
		)
			return;
		if (next && before) detent();
		setPick(next);
		if (!next) setMenuShown(false);
		place();
	}

	function place() {
		const p = pick();
		const highlights = "highlights" in CSS ? CSS.highlights : undefined;
		if (!p) {
			highlights?.delete(HIGHLIGHT);
			setLines(undefined);
			return;
		}
		highlights?.set(HIGHLIGHT, new Highlight(p.page.range(p.start, p.end)));
		const first = p.page.range(p.start, p.start + 1).getClientRects()[0];
		const last = [...p.page.range(p.end - 1, p.end).getClientRects()].at(-1);
		setLines(first && last ? { first, last } : undefined);
	}

	// Above the pick where there's room, under it where there isn't; centred on one line, on the screen for more.
	function showMenu() {
		const l = lines();
		if (!l || !menu) return;
		const { first, last } = l;
		const width = menu.offsetWidth;
		const height = menu.offsetHeight;
		const centre =
			Math.abs(first.top - last.top) < 2
				? (first.left + last.right) / 2
				: innerWidth / 2;
		const above = first.top - 22 - height;
		setMenuAt({
			x: Math.min(Math.max(centre - width / 2, 10), innerWidth - width - 10),
			y:
				above > 64
					? above
					: Math.min(last.bottom + 24, innerHeight - height - 12),
		});
		setMenuShown(true);
	}

	const inside = (x: number, y: number) => {
		const p = pick();
		if (!p) return false;
		return [...p.page.range(p.start, p.end).getClientRects()].some(
			(r) =>
				x >= r.left - 4 &&
				x <= r.right + 4 &&
				y >= r.top - 4 &&
				y <= r.bottom + 4,
		);
	};

	createEffect(
		on(
			() => props.letGo,
			() => choose(undefined),
			{ defer: true },
		),
	);

	createEffect(() => {
		const feed = props.container;
		if (!feed) return;
		feed.style.setProperty(
			"--pick",
			`color-mix(in srgb, ${props.accent} 26%, transparent)`,
		);
	});

	createEffect(() => {
		const feed = props.container;
		if (!feed) return;
		let press: Press | undefined;
		let settle: ReturnType<typeof setTimeout> | undefined;

		function begin() {
			const p = press;
			if (!p?.card) return;
			const page = new PageText(p.card);
			const at = page.offsetAt(p.x, p.y);
			const word = at === undefined ? undefined : page.wordNear(at);
			if (!word) return;
			// Held on the margin or below the last line, there's no word under the finger to pick.
			const box = page.range(word.start, word.end).getBoundingClientRect();
			if (
				p.x < box.left - 24 ||
				p.x > box.right + 24 ||
				p.y < box.top - 16 ||
				p.y > box.bottom + 16
			)
				return;
			p.page = page;
			p.anchor = word;
			setMenuShown(false);
			setPick(undefined);
			// A fresh pair of handles, rather than the last pick's sliding over.
			setLines(undefined);
			choose({ page, ...span(word, word) });
			tick();
		}

		const down = (e: PointerEvent) => {
			if (!e.isPrimary || e.button > 0) return;
			const card = (e.target as Element).closest<HTMLElement>("[data-card]");
			press = {
				card,
				held: pick() !== undefined,
				moved: false,
				x: e.clientX,
				y: e.clientY,
			};
			setGlide(true);
			if (card) press.timer = setTimeout(begin, HOLD_MS);
		};

		const slide = perFrame((e: PointerEvent) => {
			const p = press;
			if (!p?.page || !p.anchor) return;
			const word = wordAt(p.page, e.clientX, e.clientY);
			if (word) choose({ page: p.page, ...span(p.anchor, word) });
		});

		const move = (e: PointerEvent) => {
			const p = press;
			if (!p) return;
			if (p.page) return slide(e);
			if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP) {
				clearTimeout(p.timer);
				p.moved = true;
			}
		};

		// Ours, a pick or a tap that lets one go, never reaches the feed's own tap (the rail, a double-tap save).
		const up = (e: PointerEvent) => {
			slide.flush();
			const p = press;
			press = undefined;
			if (!p) return;
			clearTimeout(p.timer);
			if (p.page) {
				e.stopPropagation();
				showMenu();
				return;
			}
			if (!p.held || p.moved || e.type === "pointercancel") return;
			e.stopPropagation();
			if (inside(e.clientX, e.clientY)) showMenu();
			else choose(undefined);
		};

		// Once a hold has picked a word, the finger is picking, not scrolling.
		const hold = (e: TouchEvent) => {
			if (press?.page) e.preventDefault();
		};
		const noMenu = (e: Event) => {
			if ((e.target as Element).closest("[data-card]")) e.preventDefault();
		};

		// A swipe off the card lets the pick go; anything less carries the handles along.
		const scrolled = () => {
			const p = pick();
			if (!p) return;
			const box = p.page.root.getBoundingClientRect();
			if (Math.abs(box.top) > box.height * 0.3) return choose(undefined);
			setGlide(false);
			setMenuShown(false);
			place();
			clearTimeout(settle);
			settle = setTimeout(showMenu, 140);
		};
		const resized = () => {
			setGlide(false);
			place();
			if (menuShown()) showMenu();
		};

		feed.addEventListener("pointerdown", down);
		feed.addEventListener("pointermove", move);
		feed.addEventListener("pointerup", up);
		feed.addEventListener("pointercancel", up);
		feed.addEventListener("touchmove", hold, { passive: false });
		feed.addEventListener("contextmenu", noMenu);
		feed.addEventListener("scroll", scrolled, { passive: true });
		window.addEventListener("resize", resized);
		onCleanup(() => {
			clearTimeout(press?.timer);
			clearTimeout(settle);
			feed.removeEventListener("pointerdown", down);
			feed.removeEventListener("pointermove", move);
			feed.removeEventListener("pointerup", up);
			feed.removeEventListener("pointercancel", up);
			feed.removeEventListener("touchmove", hold);
			feed.removeEventListener("contextmenu", noMenu);
			feed.removeEventListener("scroll", scrolled);
			window.removeEventListener("resize", resized);
		});
	});

	onCleanup(() => "highlights" in CSS && CSS.highlights.delete(HIGHLIGHT));

	// A handle moves its own end; the other end stays put, and the two can't cross.
	let drag: { dx: number; dy: number; fixed: Word; side: Side } | undefined;

	function grab(side: Side, e: PointerEvent) {
		const p = pick();
		const l = lines();
		if (!p || !l) return;
		const fixed =
			side === "start" ? p.page.wordNear(p.end - 1) : p.page.wordNear(p.start);
		if (!fixed) return;
		e.preventDefault();
		try {
			(e.currentTarget as Element).setPointerCapture(e.pointerId);
		} catch {}
		const line = side === "start" ? l.first : l.last;
		drag = {
			dx: e.clientX - (side === "start" ? line.left : line.right),
			dy: e.clientY - (line.top + line.height / 2),
			fixed,
			side,
		};
		setGlide(true);
		setMenuShown(false);
	}

	const pull = perFrame((e: PointerEvent) => {
		const p = pick();
		if (!drag || !p) return;
		const box = p.page.root.getBoundingClientRect();
		const x = Math.min(Math.max(e.clientX - drag.dx, box.left), box.right);
		const y = Math.min(Math.max(e.clientY - drag.dy, box.top), box.bottom);
		setFollow({ side: drag.side, x, y });
		let word = wordAt(p.page, x + (drag.side === "start" ? 2 : -2), y);
		if (!word) return;
		if (drag.side === "end" && word.start < drag.fixed.start) word = drag.fixed;
		if (drag.side === "start" && word.start > drag.fixed.start)
			word = drag.fixed;
		choose({ page: p.page, ...span(drag.fixed, word) });
	});

	function drop() {
		if (!drag) return;
		pull.flush();
		drag = undefined;
		setFollow(undefined);
		showMenu();
	}

	function act(run: (passage: string) => void) {
		const text = passage();
		choose(undefined);
		run(text);
	}

	async function copy() {
		const text = passage();
		choose(undefined);
		try {
			await navigator.clipboard.writeText(text);
			toast.success("Copied");
		} catch {
			toast.error("Could not copy that");
		}
	}

	function Handle(handle: { side: Side }) {
		const spot = () => {
			const l = lines();
			if (!l) return { height: 0, top: 0, x: 0 };
			const line = handle.side === "start" ? l.first : l.last;
			const f = follow();
			if (f?.side === handle.side)
				return { height: line.height, top: f.y - line.height / 2, x: f.x };
			return {
				height: line.height,
				top: line.top,
				x: handle.side === "start" ? line.left : line.right,
			};
		};
		return (
			<div
				aria-hidden="true"
				class="pick-handle"
				data-glide={glide() && follow()?.side !== handle.side}
				data-side={handle.side}
				onPointerCancel={drop}
				onPointerDown={(e) => grab(handle.side, e)}
				onPointerMove={pull}
				onPointerUp={drop}
				style={{
					color: props.accent,
					height: `${spot().height + REACH}px`,
					transform: `translate(${spot().x - 22}px, ${handle.side === "start" ? spot().top - REACH : spot().top}px)`,
					"--line": `${spot().height}px`,
				}}
			/>
		);
	}

	return (
		<>
			<Show when={lines()}>
				<Handle side="start" />
				<Handle side="end" />
			</Show>

			<Show when={pick()}>
				<div
					aria-label="Selection"
					class="pick-menu fixed z-[42] flex gap-0.5 rounded-full p-[5px]"
					data-shown={menuShown()}
					ref={menu}
					role="toolbar"
					style={{
						background: props.ink,
						color: props.paper,
						left: `${menuAt().x}px`,
						top: `${menuAt().y}px`,
					}}
				>
					<MenuButton label="Explain" onClick={() => act(props.onExplain)}>
						<Lightbulb size={18} />
					</MenuButton>
					<MenuButton
						label={props.isSaved(passage()) ? "Saved" : "Save"}
						onClick={() => act(props.onSave)}
					>
						<BookmarkSimple
							size={18}
							weight={props.isSaved(passage()) ? "fill" : "regular"}
						/>
					</MenuButton>
					<MenuButton label="Share" onClick={() => act(props.onShare)}>
						<Export size={18} />
					</MenuButton>
					<MenuButton label="Copy" onClick={() => void copy()}>
						<Copy size={18} />
					</MenuButton>
				</div>
			</Show>
		</>
	);
}

function MenuButton(props: {
	children: JSX.Element;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			class="flex items-center gap-1.5 rounded-full px-[11px] py-[9px] font-medium text-[14px] leading-none active:bg-current/15"
			onClick={props.onClick}
			type="button"
		>
			{props.children}
			{props.label}
		</button>
	);
}
