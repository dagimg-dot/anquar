import {
	type Block,
	type Card,
	HEADING_SCALE,
	paginate,
	type StyleRun,
	splitSentences,
} from "anquar-core";
import { LAYOUT_SAMPLE, readLayout } from "../lib/card-layout.ts";
import { READER_THEMES, THEME_ACCENTS } from "../lib/reader-themes.ts";
import { readTimes, STREAK_MIN, wordsIn } from "../lib/reading.ts";
import { coverHTML } from "./covers.ts";
import { drawMeter, meterSVG } from "./meter.ts";
import { device, icon } from "./phone.ts";
import { MOBY_DICK } from "./sample.ts";
import { renderShare } from "./share-card.ts";

const RING = 115.6;
// The reader's floor (MIN_BRIGHTNESS), and how far a slide on the lamp goes to reach it.
const MIN_LEVEL = 0.3;
const RANGE_PX = 190;
// Phosphor's Lamp as BrightnessLamp draws it, its shade filled as far as the page is lit.
const SHADE =
	"M69.28 40h117.44a8 8 0 0 1 7.35 4.85l41.15 96A8 8 0 0 1 227.87 152H28.13a8 8 0 0 1-7.35-11.15l41.15-96A8 8 0 0 1 69.28 40Z";
const lampSVG = () =>
	`<svg class="ic" viewBox="0 0 256 256" aria-hidden="true" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"><path class="lamp-lit" d="${SHADE}" fill="currentColor" fill-opacity="0.56" stroke="none"/><path d="${SHADE}" fill="none"/><path d="M128 152v64M96 216h64M200 152v40" fill="none"/></svg>`;
const CHAPTERS = [
	"Loomings",
	"The Carpet-Bag",
	"The Spouter-Inn",
	"The Counterpane",
	"Breakfast",
	"The Street",
	"The Chapel",
	"The Pulpit",
];
const EXPLAINED = "especially whenever my hypos get such an upper hand of me";
const ANSWER = {
	word: "hypos",
	gist: "Low spirits; a fit of gloom.",
	detail:
		"Short for hypochondria, which in Melville's day meant melancholy rather than imagined illness. Ishmael is saying that when his gloom gets the better of him, he goes to sea.",
};

const escapeHTML = (text: string) =>
	text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const runsHTML = (runs: StyleRun[]) =>
	runs
		.map((run) => {
			let html = escapeHTML(run.text);
			if (run.italic) html = `<em>${html}</em>`;
			if (run.bold) html = `<strong>${html}</strong>`;
			return html;
		})
		.join("");

const blockHTML = (block: Block) => {
	if (block.type === "heading")
		return `<h2${block.level <= 2 ? ' class="centred"' : ""} style="font-size:${HEADING_SCALE[block.level]}em">${runsHTML(block.runs)}</h2>`;
	if (block.type === "text") return `<p>${runsHTML(block.runs)}</p>`;
	return "";
};

// Chapter 1 as the parser hands a chapter over: its title, then a block per paragraph.
function chapterBlocks(): Block[] {
	const run = (text: string): StyleRun[] => [
		{ text, bold: false, italic: false },
	];
	const { heading, paragraphs } = MOBY_DICK;
	return [
		{
			type: "heading",
			level: 2,
			id: "c0-0",
			chapterIndex: 0,
			position: 0,
			charCount: heading.length,
			content: heading,
			runs: run(heading),
		},
		...paragraphs.map(
			(text, i): Block => ({
				type: "text",
				id: `c0-${i + 1}`,
				chapterIndex: 0,
				position: i + 1,
				charCount: text.length,
				content: text,
				runs: run(text),
			}),
		),
	];
}

// Measured as the reader's LayoutProbe measures: a hidden card in the cards' own type.
function measureLayout() {
	const probe = document.createElement("section");
	probe.className = "r-card r-probe";
	probe.setAttribute("aria-hidden", "true");
	probe.innerHTML = `<div class="r-measure"><span class="r-line">x</span><p class="r-sample">${LAYOUT_SAMPLE}</p></div>`;
	document.body.append(probe);
	const layout = readLayout(
		probe,
		probe.querySelector("p") as HTMLElement,
		probe.querySelector(".r-line") as HTMLElement,
	);
	probe.remove();
	return layout;
}

const sheet = (name: string, title: string, body: string, heading = title) =>
	`<div class="sheet" data-sheet-panel="${name}" role="dialog" aria-label="${title}"><div class="sheet-handle"></div><div class="sheet-head">${heading}<button class="sheet-close" type="button" aria-label="Close">${icon("x-bold")}</button></div>${body}</div>`;

const railItem = (name: string, label: string, glyph: string, order: number) =>
	`<button class="rail-item" type="button" data-rail="${name}" style="--i:${order}">${glyph}<span class="rail-label">${label}</span></button>`;

function phoneBody() {
	const chips = EXPLAINED.split(" ")
		.map(
			(word) =>
				`<span class="chip-word${word === ANSWER.word ? " picked" : ""}">${word}</span>`,
		)
		.join("");
	const words = (text: string) =>
		text
			.split(" ")
			.map((w, i) => `<span class="explain-word" style="--w:${i}">${w} </span>`)
			.join("");

	return `<div class="r-scroll" tabindex="0" role="region" aria-label="Moby-Dick, chapter 1, as anquar cards. Scroll to read."></div>
		<div class="r-dim"></div>
		<div class="lamp-scrim" hidden></div>
		<button class="back-chip" type="button" aria-label="Back to the Feed tab">${icon("caret-left-bold")}Library</button>
		<div class="rail" data-shown="true">
			${railItem("contents", "Contents", `<span class="ring"><span class="cover">${coverHTML("moby")}</span><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="18.4" fill="none" stroke="currentColor" stroke-width="2.7" opacity="0.22"/><circle class="ring-arc" cx="21" cy="21" r="18.4" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/></svg></span>`, 5)}
			${railItem("explain", "Explain", `<span class="rail-glyph">${icon("lightbulb")}</span>`, 4)}
			${railItem("save", "Save", `<span class="rail-glyph">${icon("bookmark-simple")}</span>`, 3)}
			${railItem("share", "Share", `<span class="rail-glyph">${icon("export")}</span>`, 2)}
			<div class="lamp-wrap">
				<div class="rail-item rail-lamp" role="slider" tabindex="0" aria-label="Brightness" aria-valuemin="30" aria-valuemax="100" aria-valuenow="100" style="--i:1"><span class="rail-glyph">${lampSVG()}</span><span class="rail-label">Dim</span></div>
				<div class="lamp-box" data-open="false" data-pinned="false"><span class="lamp-read">100%</span><div class="lamp-pill"><div class="lamp-fill"></div><span class="lamp-ic">${lampSVG()}</span></div></div>
			</div>
			${railItem("settings", "Settings", `<span class="rail-glyph">${icon("gear-six")}</span>`, 0)}
		</div>
		${sheet("contents", "Contents", `<ol class="toc">${CHAPTERS.map((title, i) => `<li><span>${title}</span><span>${i + 1}</span></li>`).join("")}</ol>`)}
		${sheet(
			"explain",
			"Explain",
			`<div class="chips">${chips}</div>
			<div class="answer">
				<div class="asked">${ANSWER.word}</div>
				<div class="asked-in">in “${EXPLAINED}”</div>
				<div class="explain-rules" role="status" aria-label="Thinking"><i></i><i></i><i></i></div>
				<p class="gist">${words(ANSWER.gist)}</p>
				<p class="detail">${words(ANSWER.detail)}</p>
			</div>
			<p class="quiet">An example answer. Explain asks Gemini, with your own key.</p>`,
			`${icon("lightbulb-fill", "ic accent")}Explain`,
		)}
		${sheet("share", "Share", `<div class="share-art"></div><p class="quiet centred">The passage goes as an image, and as text with the title and author below it.</p>`)}
		${sheet(
			"settings",
			"Reader settings",
			`<div class="themes">${READER_THEMES.map((t) => `<button class="theme-opt" type="button" data-reader-theme="${t.id}" aria-pressed="false"><span class="sw" style="background:${t.bgColor};color:${t.textColor}">Aa</span>${t.label}</button>`).join("")}</div><p class="quiet">Type size, line height and margins live here too. Change them and you stay on the same words.</p>`,
			"Reader",
		)}
		<div class="sheet-scrim"></div>`;
}

// The reader demo: chapter 1 of Moby-Dick paged by anquar-core into cards, with the rail, its sheets, the
// five themes, and cards counted the way the app counts them.
export function mountReaderPhone(slot: HTMLElement, controls: HTMLElement) {
	slot.innerHTML = device({
		className: "reader-screen",
		label: "The anquar reader, showing Moby-Dick",
		time: "21:14",
		body: phoneBody(),
	});
	controls.innerHTML = `<div class="reader-themes" role="group" aria-label="Reader theme">${READER_THEMES.map((t) => `<button class="rt" type="button" data-reader-theme="${t.id}" aria-pressed="false" style="--sw-bg:${t.bgColor};--sw-fg:${t.textColor}"><i></i>${t.label}</button>`).join("")}</div><p class="tally" aria-live="polite"></p>`;

	const screen = slot.querySelector<HTMLElement>(
		".reader-screen",
	) as HTMLElement;
	const reader = screen.querySelector<HTMLElement>(".r-scroll") as HTMLElement;
	const rail = screen.querySelector<HTMLElement>(".rail") as HTMLElement;
	const save = rail.querySelector<HTMLElement>(
		'[data-rail="save"]',
	) as HTMLElement;
	const tally = controls.querySelector<HTMLElement>(".tally") as HTMLElement;

	let cards: Card[] = [];
	let current = 0;
	const saved = new Set<number>();
	const counted = new Set<number>();
	let countTimer = 0;
	let inView = false;

	function setTheme(id: string) {
		const theme = READER_THEMES.find((t) => t.id === id) ?? READER_THEMES[0];
		screen.style.setProperty("--r-bg", theme.bgColor);
		screen.style.setProperty("--r-fg", theme.textColor);
		screen.style.setProperty(
			"--r-save",
			THEME_ACCENTS[theme.id]?.save ?? theme.textColor,
		);
		for (const b of document.querySelectorAll("[data-reader-theme]"))
			b.setAttribute(
				"aria-pressed",
				String((b as HTMLElement).dataset.readerTheme === id),
			);
	}

	function renderTally() {
		const n = counted.size;
		const plural = `${n} anquar${n === 1 ? "" : "s"}`;
		const text =
			n === 0
				? "Read a card here and it counts, once you've had time to read it."
				: n < STREAK_MIN
					? `<strong>${plural} read here.</strong> ${STREAK_MIN - n} more would keep a streak.`
					: `<strong>${plural} read here.</strong> That keeps today's streak.`;
		tally.innerHTML = `${meterSVG({ stroke: 6 })}<span>${text}</span>`;
		drawMeter(
			tally.querySelector("svg") as SVGSVGElement,
			Math.min(1, n / STREAK_MIN),
		);
	}

	// A card counts once it has been on screen for its words at 600 wpm (readTimes), and only while the reader
	// is in view.
	function startCount() {
		clearTimeout(countTimer);
		if (!inView || document.hidden || !cards.length || counted.has(current))
			return;
		const i = current;
		countTimer = window.setTimeout(
			() => {
				counted.add(i);
				renderTally();
			},
			readTimes(wordsIn(cards[i].blocks)).counts * 1000,
		);
	}

	function setCurrent(i: number) {
		current = i;
		screen
			.querySelector(".ring-arc")
			?.setAttribute(
				"stroke-dashoffset",
				String(RING * (1 - (i + 1) / cards.length)),
			);
		const isSaved = saved.has(i);
		save.classList.toggle("saved", isSaved);
		save.setAttribute("aria-pressed", String(isSaved));
		save
			.querySelector("use")
			?.setAttribute(
				"href",
				`/landing/icons.svg#i-bookmark-simple${isSaved ? "-fill" : ""}`,
			);
		startCount();
	}

	function build() {
		const layout = measureLayout();
		if (!layout) return;
		cards = paginate([{ index: 0, blocks: chapterBlocks() }], layout);
		reader.innerHTML = cards
			.map(
				(card, i) =>
					`<section class="r-card" data-i="${i}" aria-label="Card ${i + 1} of ${cards.length}"><div class="r-inner">${card.blocks.map(blockHTML).join("")}</div></section>`,
			)
			.join("");
		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries)
					if (entry.isIntersecting)
						setCurrent(Number((entry.target as HTMLElement).dataset.i));
			},
			{ root: reader, threshold: 0.6 },
		);
		for (const card of reader.children) io.observe(card);
		setCurrent(0);
	}

	// What Share sends from the card on screen: its first sentences, up to about thirty words.
	function passage() {
		const text = cards[current]?.blocks.find((b) => b.type === "text");
		if (text?.type !== "text") return MOBY_DICK.paragraphs[0];
		let out = "";
		for (const sentence of splitSentences(text.content)) {
			if (out && `${out} ${sentence}`.split(/\s+/).length > 34) break;
			out = out ? `${out} ${sentence}` : sentence;
			if (out.split(/\s+/).length > 22) break;
		}
		return escapeHTML(out);
	}

	let opener: HTMLElement | null = null;
	function openSheet(name: string, from: HTMLElement) {
		closeSheets();
		opener = from;
		const panel = screen.querySelector<HTMLElement>(
			`[data-sheet-panel="${name}"]`,
		);
		if (!panel) return;
		if (name === "share")
			renderShare(
				panel.querySelector(".share-art") as Element,
				"moby",
				passage(),
			);
		// Explain thinks for a moment, then its answer comes in a word at a time, as it streams in the app.
		const answer = panel.querySelector(".answer");
		if (answer) {
			answer.classList.remove("answered");
			window.setTimeout(() => answer.classList.add("answered"), 900);
		}
		panel.classList.remove("open");
		void panel.offsetWidth;
		panel.classList.add("open");
		panel
			.querySelector<HTMLElement>(".sheet-close")
			?.focus({ preventScroll: true });
	}
	function closeSheets() {
		const open = screen.querySelector(".sheet.open");
		if (!open) return;
		open.classList.remove("open");
		opener?.focus({ preventScroll: true });
	}

	// The lamp, as BrightnessLamp works: press it and slide, and the pill grows out of it while the page dims;
	// a tap leaves the pill open until the page is tapped. The level isn't kept: the app reads the same storage.
	const lamp = rail.querySelector<HTMLElement>(".rail-lamp") as HTMLElement;
	const pillBox = rail.querySelector<HTMLElement>(".lamp-box") as HTMLElement;
	const pill = pillBox.querySelector<HTMLElement>(".lamp-pill") as HTMLElement;
	const dim = screen.querySelector<HTMLElement>(".r-dim") as HTMLElement;
	const lampScrim = screen.querySelector<HTMLElement>(
		".lamp-scrim",
	) as HTMLElement;
	let level = 1;
	let lampTimer = 0;
	let press: { from: number; y: number } | undefined;
	let slid = false;
	let onPill = false;

	function setLevel(value: number) {
		const before = level;
		level = Math.min(1, Math.max(MIN_LEVEL, value));
		if (level !== before && (level === 1 || level === MIN_LEVEL))
			navigator.vibrate?.(10);
		const lit = (level - MIN_LEVEL) / (1 - MIN_LEVEL);
		const percent = `${Math.round(level * 100)}%`;
		dim.style.opacity = String(1 - level);
		for (const shade of rail.querySelectorAll(".lamp-lit"))
			shade.setAttribute("fill-opacity", (0.06 + 0.5 * lit).toFixed(2));
		(lamp.querySelector(".rail-label") as HTMLElement).textContent =
			level === 1 ? "Dim" : percent;
		(pillBox.querySelector(".lamp-read") as HTMLElement).textContent = percent;
		(pill.querySelector(".lamp-fill") as HTMLElement).style.height =
			`${level * 100}%`;
		lamp.setAttribute("aria-valuenow", String(Math.round(level * 100)));
	}
	function closePill() {
		clearTimeout(lampTimer);
		pillBox.dataset.open = "false";
		pillBox.dataset.pinned = "false";
		rail.dataset.dimming = "false";
		lampScrim.hidden = true;
	}
	function closePillIn(ms: number) {
		clearTimeout(lampTimer);
		lampTimer = window.setTimeout(closePill, ms);
	}
	function showPill(pinned: boolean) {
		clearTimeout(lampTimer);
		pillBox.dataset.open = "true";
		pillBox.dataset.pinned = String(pinned);
		rail.dataset.dimming = "true";
		lampScrim.hidden = !pinned;
		if (pinned) closePillIn(4000);
	}
	const togglePill = () =>
		pillBox.dataset.pinned === "true" ? closePill() : showPill(true);
	// The phone is drawn 844px tall and zoomed to fit its column, so a slide is measured in the phone's pixels.
	const phonePx = () => screen.getBoundingClientRect().height / 844;
	const setAt = (y: number) => {
		const rect = pill.getBoundingClientRect();
		setLevel(1 - (y - rect.top) / rect.height);
	};

	lamp.addEventListener("pointerdown", (e) => {
		lamp.setPointerCapture(e.pointerId);
		press = { from: level, y: e.clientY };
		slid = false;
	});
	lamp.addEventListener("pointermove", (e) => {
		if (!press) return;
		const up = (press.y - e.clientY) / phonePx();
		if (!slid && Math.abs(up) < 6) return;
		if (!slid) {
			slid = true;
			showPill(false);
		}
		setLevel(press.from + (up / RANGE_PX) * (1 - MIN_LEVEL));
	});
	const release = () => {
		press = undefined;
		if (!slid) return;
		closePillIn(650);
		// The click that may follow a slide isn't a tap.
		setTimeout(() => {
			slid = false;
		});
	};
	lamp.addEventListener("pointerup", release);
	lamp.addEventListener("pointercancel", release);
	lamp.addEventListener("click", () => {
		if (!slid) togglePill();
	});
	lamp.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") togglePill();
		else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
			setLevel(level + (e.key === "ArrowUp" ? 0.05 : -0.05));
			showPill(true);
		} else return;
		e.preventDefault();
	});
	pill.addEventListener("pointerdown", (e) => {
		pill.setPointerCapture(e.pointerId);
		clearTimeout(lampTimer);
		onPill = true;
		setAt(e.clientY);
	});
	pill.addEventListener("pointermove", (e) => {
		if (onPill) setAt(e.clientY);
	});
	pill.addEventListener("pointerup", () => {
		onPill = false;
		closePillIn(4000);
	});
	lampScrim.addEventListener("click", closePill);

	rail.addEventListener("click", (e) => {
		const item = (e.target as Element).closest<HTMLElement>("[data-rail]");
		if (!item) return;
		if (item.dataset.rail === "save") {
			if (saved.has(current)) saved.delete(current);
			else saved.add(current);
			setCurrent(current);
		} else openSheet(item.dataset.rail as string, item);
	});
	screen.addEventListener("click", (e) => {
		const target = e.target as Element;
		if (
			target.closest(".sheet-close") ||
			target.classList.contains("sheet-scrim")
		)
			closeSheets();
	});
	screen.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			closeSheets();
			closePill();
		}
	});
	// Library leaves the book as it does in the app: here, back up to the hero's Feed tab.
	screen.querySelector(".back-chip")?.addEventListener("click", () => {
		document.querySelector('[data-phone="feed"]')?.scrollIntoView({
			behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
			block: "center",
		});
	});
	// The rail rests once you start reading, and a tap on the page brings it back, as in the app.
	reader.addEventListener(
		"scroll",
		() => {
			if (rail.dataset.shown === "true") rail.dataset.shown = "false";
		},
		{ passive: true },
	);
	reader.addEventListener("click", (e) => {
		if (window.getSelection()?.toString()) return;
		if ((e.target as Element).closest(".r-card"))
			rail.dataset.shown = String(rail.dataset.shown !== "true");
	});
	document.addEventListener("click", (e) => {
		const button = (e.target as Element).closest<HTMLElement>(
			"[data-reader-theme]",
		);
		if (button?.dataset.readerTheme) setTheme(button.dataset.readerTheme);
	});

	new IntersectionObserver(
		([entry]) => {
			inView = entry.isIntersecting;
			startCount();
		},
		{ threshold: 0.6 },
	).observe(screen);
	document.addEventListener("visibilitychange", startCount);

	setTheme("sepia");
	renderTally();
	void (document.fonts?.ready ?? Promise.resolve()).then(build);
}
