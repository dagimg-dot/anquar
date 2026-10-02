import {
	DEFAULT_GOAL,
	dayKey,
	type Moment,
	momentFor,
	type Pulse,
	pulseLine,
	pulseOf,
	shiftDay,
} from "../lib/reading.ts";
import { meterSVG, tweenMeter } from "./meter.ts";
import { markSVG } from "./phone.ts";

// Twelve days read before today, so the demo starts with a streak to keep and a rest day banked.
const BEFORE = [31, 30, 26, 33, 30, 30, 8, 30, 34, 30, 29, 30];
const START = 3;
const PACE_SECONDS = 38;

const reducedMotion = () =>
	matchMedia("(prefers-reduced-motion: reduce)").matches;

function pulseFor(read: number): Pulse {
	const today = dayKey();
	const rows = [...BEFORE, read].map((anquars, i) => ({
		date: shiftDay(today, i - BEFORE.length),
		anquars,
		seconds: anquars * PACE_SECONDS,
	}));
	return pulseOf(rows, today);
}

// The meter you fill: the Reading Pulse card's rules from src/lib/reading.ts, read an anquar at a time.
export function mountPulseDemo(stage: HTMLElement) {
	stage.innerHTML = `<div class="moment" aria-live="polite"><span class="moment-mark">${markSVG("")}</span><span class="moment-text"></span></div>
		<div class="stage-meter">${meterSVG()}</div>
		<div class="stage-count"><span class="stage-today"></span><small>/ ${DEFAULT_GOAL}</small></div>
		<div class="stage-label">anquars today</div>
		<span class="chip"></span>
		<p class="pulse-line"></p>
		<div class="stage-actions">
			<button class="btn btn-primary" type="button" data-read="1">Read an anquar</button>
			<button class="btn btn-ghost" type="button" data-read="5">Read five</button>
			<button class="btn btn-ghost" type="button" data-read="reset" hidden>Start over</button>
		</div>`;

	const meter = stage.querySelector(".stage-meter svg") as SVGSVGElement;
	const moment = stage.querySelector(".moment") as HTMLElement;
	const reset = stage.querySelector<HTMLButtonElement>(
		'[data-read="reset"]',
	) as HTMLButtonElement;
	let today = START;
	let shown: Moment["kind"][] = [];
	let momentTimer = 0;

	function showMoment(m: Moment) {
		shown.push(m.kind);
		(moment.querySelector(".moment-text") as HTMLElement).innerHTML =
			`${m.text}<small>· ${m.detail}</small>`;
		moment.classList.add("show");
		clearTimeout(momentTimer);
		momentTimer = window.setTimeout(
			() => moment.classList.remove("show"),
			2600,
		);
	}

	function render(before: number) {
		const p = pulseFor(today);
		const line = pulseLine(p, DEFAULT_GOAL, new Date().getHours());
		(stage.querySelector(".stage-today") as HTMLElement).textContent = String(
			p.today,
		);
		const chip = stage.querySelector(".chip") as HTMLElement;
		chip.className = `chip${p.kept ? " kept" : ""}`;
		chip.innerHTML = `🔥 ${p.streak}${p.rests ? ` <span class="rest">· ${p.rests} rest</span>` : ""}`;
		const lineEl = stage.querySelector(".pulse-line") as HTMLElement;
		lineEl.classList.toggle("risk", line.risk);
		lineEl.innerHTML = line.parts
			.map((part) =>
				part.strong ? `<strong>${part.text}</strong>` : part.text,
			)
			.join("");
		reset.hidden = today === START;
		tweenMeter(meter, Math.min(1, p.today / DEFAULT_GOAL), 520);

		const m = momentFor(p, DEFAULT_GOAL, shown);
		if (m) showMoment(m);
		// Closing the day lifts the meter once, as the Feed tab's card does.
		if (before < DEFAULT_GOAL && today >= DEFAULT_GOAL && !reducedMotion())
			window.setTimeout(
				() =>
					meter.animate(
						[
							{ transform: "none" },
							{ transform: "translateY(-10px)", offset: 0.38 },
							{ transform: "none" },
						],
						{ duration: 560, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
					),
				420,
			);
	}

	stage.addEventListener("click", (e) => {
		const read = (e.target as Element).closest<HTMLElement>("[data-read]")
			?.dataset.read;
		if (!read) return;
		const before = today;
		if (read === "reset") {
			today = START;
			shown = [];
			moment.classList.remove("show");
		} else today += Number(read);
		render(before);
	});

	render(START);
}
