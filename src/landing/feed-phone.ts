import {
	DEFAULT_GOAL,
	dayKey,
	pulseLine,
	pulseOf,
	shiftDay,
} from "../lib/reading.ts";
import { bookCover } from "./covers.ts";
import { drawMeter, meterSVG, tweenMeter } from "./meter.ts";
import { device, icon, markSVG } from "./phone.ts";
import {
	BOOKS,
	BOOKS_FINISHED,
	type BookId,
	CONTINUE,
	FINISHED,
	historyRows,
	IN_PROGRESS,
} from "./sample.ts";

const book = (id: BookId, percent?: number) =>
	`<div class="book">${bookCover(id, percent)}<div class="book-title">${BOOKS[id].title}</div><div class="book-author">${BOOKS[id].author}</div></div>`;

const weekday = (date: string) =>
	new Date(`${date}T12:00`).toLocaleDateString("en", { weekday: "narrow" });

// The hero: the Feed tab with a sample library, its Reading Pulse worked out by the app's own rules.
export function mountFeedPhone(slot: HTMLElement) {
	const pulse = pulseOf(historyRows(dayKey(), shiftDay), dayKey());
	const line = pulseLine(pulse, DEFAULT_GOAL, new Date().getHours())
		.parts.map((part) =>
			part.strong ? `<strong>${part.text}</strong>` : part.text,
		)
		.join("");
	const now = BOOKS[CONTINUE.book];

	const body = `<div class="scroller" tabindex="-1">
		<div class="app-header">${markSVG("mark")}<span class="word">anquar</span></div>
		<a class="now" href="#read" aria-label="Continue reading ${now.title}">
			${bookCover(CONTINUE.book, CONTINUE.percent)}
			<div class="now-body">
				<svg class="now-chev" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
				<div class="now-kicker">Continue Reading</div>
				<div class="now-title">${now.title}</div>
				<div class="now-author">${now.author}</div>
				<div class="now-progress"><span class="bar"><i style="width:${CONTINUE.percent}%"></i></span>${CONTINUE.percent}%</div>
			</div>
		</a>
		<div class="sec-head">In Progress</div>
		<div class="carousel">${IN_PROGRESS.map((b) => book(b.book, b.percent)).join("")}</div>
		<div class="sec-head sec-gap">Your Reading Pulse</div>
		<div class="pulse-card">
			<div class="pulse-top">
				<div class="meter-box">${meterSVG()}</div>
				<div>
					<div class="count">${pulse.today}<small>/ ${DEFAULT_GOAL}</small></div>
					<div class="count-label">anquars today</div>
					<span class="chip${pulse.kept ? " kept" : ""}">🔥 ${pulse.streak}${pulse.rests ? ` <span class="rest">· ${pulse.rests} rest</span>` : ""}</span>
				</div>
			</div>
			<p class="pulse-line${line.length ? "" : " empty"}">${line}</p>
			<div class="week">${pulse.week
				.map(
					(day) =>
						`<div class="day${day.today ? " today" : ""}">${meterSVG({ stroke: 6, rest: day.rest })}${weekday(day.date)}${day.today ? '<span class="dot"></span>' : ""}</div>`,
				)
				.join("")}</div>
		</div>
		<div class="stats">
			<div class="stat"><b>${pulse.minutesThisWeek}</b><span>min this week</span></div>
			<div class="stat"><b>${pulse.best}</b><span>best streak</span></div>
			<div class="stat"><b>${BOOKS_FINISHED}</b><span>books finished</span></div>
		</div>
		<div class="sec-head sec-gap-wide">Finished</div>
		<div class="carousel last">${FINISHED.map((id) => book(id)).join("")}</div>
	</div>
	<div class="tabbar" aria-hidden="true">
		<div class="tabs glass">
			<span class="pill"></span>
			<span class="tab on">${icon("book-open-fill")}</span>
			<span class="tab">${icon("books-fill")}</span>
			<span class="tab">${icon("bookmark-fill")}</span>
			<span class="tab">${icon("gear-six-fill")}</span>
		</div>
		<span class="fab glass">${icon("plus-bold")}</span>
	</div>`;

	slot.innerHTML = device({
		label: "The anquar Feed tab, with sample books and a reading streak",
		time: "21:08",
		body,
	});

	pulse.week.forEach((day, i) => {
		const svg = slot.querySelectorAll<SVGSVGElement>(".day svg")[i];
		drawMeter(svg, day.rest ? 1 : Math.min(1, day.anquars / DEFAULT_GOAL));
	});
	const meter = slot.querySelector<SVGSVGElement>(".meter-box svg");
	if (meter) {
		drawMeter(meter, 0);
		// The phone rises in first; then today's meter fills to where the day stands.
		setTimeout(
			() => tweenMeter(meter, Math.min(1, pulse.today / DEFAULT_GOAL), 1100),
			1150,
		);
	}
}
