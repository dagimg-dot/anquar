import { describe, expect, it, vi } from "vitest";
import {
	dayKey,
	markMomentShown,
	momentFor,
	momentsShown,
	pulseLine,
	pulseOf,
	type ReadingDay,
	readTimes,
	STREAK_MIN,
	shiftDay,
	wordsIn,
} from "./reading.ts";

const TODAY = "2026-09-30";

// counts[i] is what was read i days before today, oldest first ending yesterday
function history(counts: number[]): ReadingDay[] {
	return counts.map((anquars, i) => ({
		date: shiftDay(TODAY, i - counts.length),
		anquars,
		seconds: anquars * 20,
	}));
}

const week = (n = STREAK_MIN) => Array<number>(7).fill(n);

describe("dayKey", () => {
	it("ends the day at 4 a.m. local time", () => {
		expect(dayKey(new Date(2026, 8, 30, 3, 59))).toBe("2026-09-29");
		expect(dayKey(new Date(2026, 8, 30, 4, 0))).toBe("2026-09-30");
		expect(dayKey(new Date(2026, 8, 30, 23, 30))).toBe("2026-09-30");
	});

	it("moves across months and years", () => {
		expect(shiftDay("2026-09-30", 1)).toBe("2026-10-01");
		expect(shiftDay("2027-01-01", -1)).toBe("2026-12-31");
	});
});

describe("what counts", () => {
	it("counts a card at 600 wpm, never under 1.5 s", () => {
		expect(readTimes(150).counts).toBe(15);
		expect(readTimes(0).counts).toBe(1.5);
	});

	it("caps a card's time at 150 wpm, never under 10 s", () => {
		expect(readTimes(150).cap).toBe(60);
		expect(readTimes(0).cap).toBe(10);
	});

	it("counts the words of text, headings and lists", () => {
		const run = (text: string) => ({ text });
		const blocks = [
			{ type: "heading", runs: [run("Chapter One")] },
			{ type: "text", runs: [run("It was a "), run("bright cold day.")] },
			{ type: "list", items: [{ runs: [run("one two")] }] },
			{ type: "image" },
		] as unknown as Parameters<typeof wordsIn>[0];
		expect(wordsIn(blocks)).toBe(10);
	});
});

describe("the streak", () => {
	it("counts days that reach the minimum, and today once it does", () => {
		expect(pulseOf(history([5, 9, 30]), TODAY).streak).toBe(3);
		const today = [{ date: TODAY, anquars: STREAK_MIN, seconds: 0 }];
		expect(pulseOf([...history([5, 9, 30]), ...today], TODAY)).toMatchObject({
			streak: 4,
			kept: true,
		});
	});

	it("keeps yesterday's streak alive until today ends", () => {
		const p = pulseOf(history([5, 5, 5]), TODAY);
		expect(p).toMatchObject({ streak: 3, kept: false, today: 0 });
	});

	it("breaks on a day under the minimum with no rest day", () => {
		expect(pulseOf(history([5, 5, 5, 4, 5]), TODAY).streak).toBe(1);
		expect(pulseOf(history([5, 5, 5, 0, 5]), TODAY).best).toBe(3);
	});

	it("earns a rest day for seven days and spends it on a missed day", () => {
		const p = pulseOf(history([...week(), 0, 5]), TODAY);
		expect(p).toMatchObject({ streak: 8, rests: 0 });
		expect(p.week.find((d) => d.date === shiftDay(TODAY, -2))?.rest).toBe(true);
	});

	it("does not add a rest day to the streak", () => {
		const p = pulseOf(history([...week(), 0]), TODAY);
		expect(p).toMatchObject({ streak: 7, restYesterday: true, rests: 0 });
	});

	it("banks at most two rest days", () => {
		expect(
			pulseOf(history([...week(), ...week(), ...week()]), TODAY).rests,
		).toBe(2);
		expect(
			pulseOf(history([...week(), ...week(), ...week(), 0, 0, 0]), TODAY)
				.streak,
		).toBe(0);
	});

	it("starts counting from the first day anything was read", () => {
		const p = pulseOf(history([0, 0, 0, 5, 5]), TODAY);
		expect(p).toMatchObject({ streak: 2, best: 2, started: true });
		expect(pulseOf([], TODAY)).toMatchObject({ streak: 0, started: false });
	});

	it("sums the books read on the same day", () => {
		const rows = [
			{ date: shiftDay(TODAY, -1), anquars: 3, seconds: 60 },
			{ date: shiftDay(TODAY, -1), anquars: 2, seconds: 40 },
		];
		expect(pulseOf(rows, TODAY).streak).toBe(1);
	});
});

describe("the week and pace", () => {
	it("lists the last seven days ending today", () => {
		const p = pulseOf(history([1, 2, 3, 4, 5, 6, 7, 8]), TODAY);
		expect(p.week.map((d) => d.anquars)).toEqual([3, 4, 5, 6, 7, 8, 0]);
		expect(p.week.at(-1)).toMatchObject({ date: TODAY, today: true });
	});

	it("adds this week's minutes", () => {
		expect(pulseOf(history(week(9)), TODAY).minutesThisWeek).toBe(18);
	});

	it("takes the median seconds per anquar, with a default before any data", () => {
		const rows = [10, 20, 90].map((per, i) => ({
			date: shiftDay(TODAY, -1 - i),
			anquars: 10,
			seconds: per * 10,
		}));
		expect(pulseOf(rows, TODAY).pace).toBe(20);
		expect(pulseOf([], TODAY).pace).toBe(25);
	});
});

describe("what the card says", () => {
	const text = (l: ReturnType<typeof pulseLine>) =>
		l.parts.map((p) => p.text).join("");
	const at = (counts: number[], today: number) =>
		pulseOf(
			[
				...history(counts),
				{ date: TODAY, anquars: today, seconds: today * 30 },
			],
			TODAY,
		);

	it("asks a new reader for the first five", () => {
		expect(text(pulseLine(pulseOf([], TODAY), 30, 9))).toBe(
			"Read 5 anquars to start a streak, about 2 min.",
		);
	});

	it("counts down to the goal in minutes once the streak is kept", () => {
		expect(text(pulseLine(at(week(10), 16), 30, 14))).toBe(
			"14 more to close today · about 5 min.",
		);
	});

	it("warns only in the evening, and says when the streak ends", () => {
		const p = at(week(10), 2);
		expect(pulseLine(p, 30, 14)).toMatchObject({ risk: false });
		const evening = pulseLine(p, 30, 21);
		expect(evening.risk).toBe(true);
		expect(text(evening)).toBe(
			"3 anquars keep your 7-day streak. It ends at 4 a.m.",
		);
		expect(pulseLine(p, 30, 1).risk).toBe(true);
	});

	it("says a rest day was used", () => {
		expect(text(pulseLine(at([...week(), 0], 1), 30, 10))).toBe(
			"Yesterday was a rest day. 4 anquars keep the streak going.",
		);
	});

	it("points to the best streak after one ends, never the loss", () => {
		expect(text(pulseLine(at([...week(9), 0, 0], 0), 30, 10))).toBe(
			"A new streak starts today. Your best is 7 days.",
		);
	});

	it("closes the goal, then marks a best day", () => {
		expect(text(pulseLine(at(week(40), 30), 30, 22))).toBe(
			"Today's anquar is closed. Anything more is a bonus.",
		);
		expect(text(pulseLine(at(week(40), 35), 30, 22))).toBe(
			"Closed, and 5 over. Anything more is a bonus.",
		);
		expect(text(pulseLine(at(week(40), 41), 30, 22))).toBe(
			"Best day yet · 41 anquars.",
		);
	});

	it("says one anquar, not one anquars", () => {
		expect(text(pulseLine(at(week(), 4), 30, 10))).toBe(
			"1 anquar keeps your 7-day streak, about 1 min.",
		);
		expect(text(pulseLine(at([3], 2), 30, 10))).toBe(
			"3 more anquars start a streak, about 1 min.",
		);
	});
});

describe("the moment", () => {
	const at = (counts: number[], today: number) =>
		pulseOf(
			[...history(counts), { date: TODAY, anquars: today, seconds: 0 }],
			TODAY,
		);

	it("marks the streak once today's minimum is read", () => {
		expect(momentFor(at(week(), 4), 30, [])).toBeUndefined();
		expect(momentFor(at(week(), 5), 30, [])).toMatchObject({
			text: "Streak kept",
			detail: "8 days",
		});
		expect(momentFor(at([], 5), 30, [])).toMatchObject({
			text: "Streak started",
		});
		expect(momentFor(at(week(), 6), 30, ["streak"])).toBeUndefined();
	});

	it("puts the goal first, then a best day, each once", () => {
		expect(momentFor(at(week(), 30), 30, [])).toMatchObject({ kind: "goal" });
		expect(momentFor(at(week(40), 41), 30, ["goal", "streak"])).toMatchObject({
			kind: "best",
			detail: "41",
		});
		expect(
			momentFor(at(week(40), 41), 30, ["goal", "streak", "best"]),
		).toBeUndefined();
	});

	it("keeps what it has shown for the day, and the streak with the goal", () => {
		const store = new Map<string, string>();
		vi.stubGlobal("localStorage", {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => store.set(k, v),
		});
		markMomentShown(TODAY, "goal");
		expect(momentsShown(TODAY).sort()).toEqual(["goal", "streak"]);
		expect(momentsShown(shiftDay(TODAY, 1))).toEqual([]);
		vi.unstubAllGlobals();
	});
});
