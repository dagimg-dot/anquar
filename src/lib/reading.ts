import type { Block } from "anquar-core";

// The reading day ends at 4 a.m., so reading in bed after midnight counts for the evening it started.
export const DAY_ENDS_AT = 4;
export const STREAK_MIN = 5;
// Each run of seven reading days banks a rest day, two at most, and a missed day spends one. A rest day
// holds the streak without adding to it.
const REST_EVERY = 7;
const RESTS_MAX = 2;
const DEFAULT_PACE = 25;
export const DEFAULT_GOAL = 30;
const GOAL_KEY = "anquar_goal";

export function readingGoal(): number {
	const goal = Number(localStorage.getItem(GOAL_KEY));
	return goal > 0 ? goal : DEFAULT_GOAL;
}

export function setReadingGoal(goal: number) {
	localStorage.setItem(GOAL_KEY, String(goal));
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dayKey(at: Date = new Date()): string {
	const d = new Date(at.getTime() - DAY_ENDS_AT * 3_600_000);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shiftDay(key: string, days: number): string {
	const [y, m, d] = key.split("-").map(Number);
	const at = new Date(y, m - 1, d + days, 12);
	return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

export function wordsIn(blocks: readonly Block[]): number {
	let text = "";
	for (const b of blocks) {
		if (b.type === "text" || b.type === "heading")
			text += ` ${b.runs.map((r) => r.text).join("")}`;
		else if (b.type === "list")
			for (const item of b.items)
				text += ` ${item.runs.map((r) => r.text).join("")}`;
	}
	return text.split(/\s+/).filter(Boolean).length;
}

// A card counts once it has been on screen for its words at 600 wpm, faster than anyone reads, so flicking
// past doesn't count and a quick reader still does. Its time counts up to its words at 150 wpm, so a phone
// left on one card doesn't pile up minutes.
export function readTimes(words: number) {
	return {
		counts: Math.max(1.5, (words / 600) * 60),
		cap: Math.max(10, (words / 150) * 60),
	};
}

export interface ReadingDay {
	date: string;
	anquars: number;
	seconds: number;
}

export interface PulseDay {
	date: string;
	anquars: number;
	rest: boolean;
	today: boolean;
}

export interface Pulse {
	today: number;
	streak: number;
	kept: boolean;
	best: number;
	rests: number;
	restYesterday: boolean;
	bestDay: number;
	started: boolean;
	week: PulseDay[];
	minutesThisWeek: number;
	pace: number;
}

export function pulseOf(rows: readonly ReadingDay[], today: string): Pulse {
	const byDate = new Map<string, { anquars: number; seconds: number }>();
	for (const r of rows) {
		const d = byDate.get(r.date) ?? { anquars: 0, seconds: 0 };
		d.anquars += r.anquars;
		d.seconds += r.seconds;
		byDate.set(r.date, d);
	}
	const anquarsOn = (date: string) => byDate.get(date)?.anquars ?? 0;
	const read = [...byDate.keys()]
		.filter((date) => date < today && anquarsOn(date) > 0)
		.sort();

	let run = 0;
	let rests = 0;
	let best = 0;
	const restDays = new Set<string>();
	if (read.length > 0)
		for (let date = read[0]; date < today; date = shiftDay(date, 1)) {
			if (anquarsOn(date) >= STREAK_MIN) {
				run++;
				if (run % REST_EVERY === 0) rests = Math.min(RESTS_MAX, rests + 1);
			} else if (run > 0 && rests > 0) {
				rests--;
				restDays.add(date);
			} else {
				run = 0;
				rests = 0;
			}
			best = Math.max(best, run);
		}

	const todays = anquarsOn(today);
	const kept = todays >= STREAK_MIN;
	const streak = run + (kept ? 1 : 0);

	const week = Array.from({ length: 7 }, (_, i) => {
		const date = shiftDay(today, i - 6);
		return {
			date,
			anquars: anquarsOn(date),
			rest: restDays.has(date),
			today: i === 6,
		};
	});
	const weekSeconds = week.reduce(
		(sum, d) => sum + (byDate.get(d.date)?.seconds ?? 0),
		0,
	);

	const paces = Array.from({ length: 14 }, (_, i) =>
		byDate.get(shiftDay(today, -i)),
	)
		.flatMap((d) => (d && d.anquars >= 3 ? [d.seconds / d.anquars] : []))
		.sort((a, b) => a - b);

	return {
		today: todays,
		streak,
		kept,
		best: Math.max(best, streak),
		rests,
		restYesterday: restDays.has(shiftDay(today, -1)),
		bestDay: Math.max(0, ...read.map(anquarsOn)),
		started: read.length > 0 || todays > 0,
		week,
		minutesThisWeek: Math.round(weekSeconds / 60),
		pace: paces.length ? paces[Math.floor(paces.length / 2)] : DEFAULT_PACE,
	};
}

export interface LinePart {
	text: string;
	strong?: boolean;
}

export interface PulseLine {
	parts: LinePart[];
	risk: boolean;
}

const anquars = (n: number) => `${n} ${n === 1 ? "anquar" : "anquars"}`;
const verb = (n: number, v: string) => (n === 1 ? `${v}s` : v);

// What the card says next: one line, picked by where today stands, in minutes at your own pace.
export function pulseLine(p: Pulse, goal: number, hour: number): PulseLine {
	const minutes = (n: number) =>
		`about ${Math.max(1, Math.round((n * p.pace) / 60))} min`;
	const toKeep = STREAK_MIN - p.today;
	const line = (...parts: (string | LinePart)[]): PulseLine => ({
		parts: parts.map((part) =>
			typeof part === "string" ? { text: part } : part,
		),
		risk: false,
	});
	const strong = (text: string): LinePart => ({ text, strong: true });

	if (!p.started)
		return line(
			strong(`Read ${anquars(STREAK_MIN)}`),
			` to start a streak, ${minutes(STREAK_MIN)}.`,
		);
	if (p.today >= goal) {
		if (p.bestDay > 0 && p.today > p.bestDay && p.today > goal)
			return line(strong("Best day yet"), ` · ${anquars(p.today)}.`);
		if (p.today > goal)
			return line(
				strong("Closed"),
				`, and ${p.today - goal} over. Anything more is a bonus.`,
			);
		return line(
			strong("Today's anquar is closed."),
			" Anything more is a bonus.",
		);
	}
	if (!p.kept && p.streak > 0 && (hour >= 20 || hour < 4))
		return {
			...line(
				strong(anquars(toKeep)),
				` ${verb(toKeep, "keep")} your ${p.streak}-day streak. It ends at 4 a.m.`,
			),
			risk: true,
		};
	if (!p.kept && p.restYesterday)
		return line(
			"Yesterday was a ",
			strong("rest day"),
			`. ${anquars(toKeep)} ${verb(toKeep, "keep")} the streak going.`,
		);
	if (p.streak === 0 && p.best > 0 && p.today === 0)
		return line(
			"A new streak starts today. Your best is ",
			strong(`${p.best} days`),
			".",
		);
	if (!p.kept && p.streak === 0)
		return line(
			strong(`${toKeep} more ${toKeep === 1 ? "anquar" : "anquars"}`),
			` ${verb(toKeep, "start")} a streak, ${minutes(toKeep)}.`,
		);
	if (!p.kept)
		return line(
			strong(anquars(toKeep)),
			` ${verb(toKeep, "keep")} your ${p.streak}-day streak, ${minutes(toKeep)}.`,
		);
	return line(
		strong(`${goal - p.today} more`),
		` to close today · ${minutes(goal - p.today)}.`,
	);
}

export interface Moment {
	kind: "goal" | "best" | "streak";
	text: string;
	detail: string;
}

// The reader marks a threshold the moment it's crossed, each kind once a day, the goal first.
export function momentFor(
	p: Pulse,
	goal: number,
	shown: readonly string[],
): Moment | undefined {
	if (p.today >= goal && !shown.includes("goal"))
		return {
			kind: "goal",
			text: "Today's anquar is closed",
			detail: `${goal}`,
		};
	if (
		p.today > goal &&
		p.bestDay > 0 &&
		p.today > p.bestDay &&
		!shown.includes("best")
	)
		return { kind: "best", text: "Best day yet", detail: `${p.today}` };
	if (p.kept && !shown.includes("streak"))
		return p.streak === 1
			? { kind: "streak", text: "Streak started", detail: "1 day" }
			: { kind: "streak", text: "Streak kept", detail: `${p.streak} days` };
	return undefined;
}

const MOMENTS_KEY = "anquar_moments";

export function momentsShown(today: string): string[] {
	try {
		const saved = JSON.parse(localStorage.getItem(MOMENTS_KEY) ?? "{}");
		return saved.date === today ? saved.shown : [];
	} catch {
		return [];
	}
}

// Closing the goal or beating a best day keeps the streak too, so the streak isn't marked after them.
export function markMomentShown(today: string, kind: Moment["kind"]) {
	const shown = new Set([...momentsShown(today), kind, "streak"]);
	localStorage.setItem(
		MOMENTS_KEY,
		JSON.stringify({ date: today, shown: [...shown] }),
	);
}
