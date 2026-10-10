import { describe, expect, it } from "vitest";
import {
	choicesFor,
	dueWords,
	firstDue,
	graded,
	type Kept,
	KNOWN,
	marked,
	PER_DAY,
	sentenceAround,
} from "./review.ts";

const kept = (term: string, gist: string, more: Partial<Kept> = {}): Kept => ({
	askedAt: "2026-10-01T10:00:00Z",
	focus: term ? [term] : [],
	gist,
	dueOn: "2026-10-02",
	step: 0,
	...more,
});

describe("the schedule", () => {
	it("brings a kept word back the next day", () => {
		expect(firstDue("2026-10-09")).toEqual({ step: 0, dueOn: "2026-10-10" });
	});

	it("sends a right answer further off each time", () => {
		let word = { step: 0 };
		const gaps: string[] = [];
		for (let i = 0; i < KNOWN - 1; i++) {
			const next = graded(word, true, "2026-10-09");
			gaps.push(next.dueOn);
			word = next;
		}
		expect(gaps).toEqual([
			"2026-10-12",
			"2026-10-16",
			"2026-10-25",
			"2026-11-13",
		]);
	});

	it("knows a word after five right in a row, and stops bringing it back", () => {
		expect(graded({ step: KNOWN - 1 }, true, "2026-10-09")).toEqual({
			step: KNOWN,
			dueOn: "",
		});
	});

	it("brings a wrong answer back tomorrow, from the start", () => {
		expect(graded({ step: 3 }, false, "2026-10-09")).toEqual({
			step: 0,
			dueOn: "2026-10-10",
		});
	});
});

describe("dueWords", () => {
	it("takes the longest waiting first, a few a day, and never a known word", () => {
		const words = [
			kept("a", "1", { dueOn: "2026-10-09" }),
			kept("b", "2", { dueOn: "2026-10-03" }),
			kept("c", "3", { dueOn: "" }),
			kept("d", "4", { dueOn: "2026-10-10" }),
			...Array.from({ length: 8 }, (_, i) =>
				kept(`e${i}`, `e${i}`, { dueOn: "2026-10-05" }),
			),
		];
		const due = dueWords(words, "2026-10-09");
		expect(due).toHaveLength(PER_DAY);
		expect(due[0].focus).toEqual(["b"]);
		expect(due.some((k) => k.focus[0] === "c" || k.focus[0] === "d")).toBe(
			false,
		);
	});
});

describe("choicesFor", () => {
	const pool = [
		kept("spleen", "a low, irritable mood"),
		kept("hypos", "fits of low, gloomy spirits"),
		kept("retreats", "places to withdraw to"),
		kept("", "Marcus says the mind is its own refuge"),
	];

	it("offers the word's meaning among two other words'", () => {
		const choices = choicesFor(pool[0], pool, () => 0.3);
		expect(choices?.options).toHaveLength(3);
		expect(choices?.options[choices.answer]).toBe("a low, irritable mood");
		expect(choices?.options).not.toContain(
			"Marcus says the mind is its own refuge",
		);
	});

	it("asks a passage, or a word with too few others, as Show me", () => {
		expect(choicesFor(pool[3], pool)).toBeUndefined();
		expect(choicesFor(pool[0], pool.slice(0, 2))).toBeUndefined();
	});

	it("never offers the same meaning twice", () => {
		const twins = [...pool, kept("Spleen", "a low, irritable mood")];
		for (let i = 0; i < 20; i++) {
			const { options } = choicesFor(twins[0], twins) ?? { options: [] };
			expect(new Set(options.map((o) => o.toLowerCase())).size).toBe(3);
		}
	});
});

describe("sentenceAround", () => {
	const card =
		"Call me Ishmael. Some years ago, never mind how long precisely, I thought I would sail about. It is a way I have of driving off the spleen, and regulating the circulation.";

	it("keeps the sentence the word was asked in", () => {
		expect(sentenceAround(card, ["spleen"])).toBe(
			"It is a way I have of driving off the spleen, and regulating the circulation.",
		);
	});

	it("keeps a passage asked about whole", () => {
		expect(sentenceAround("  Call me\nIshmael. ", [])).toBe("Call me Ishmael.");
	});

	it("cuts a long sentence around the word", () => {
		const long = `${"word ".repeat(120)}spleen ${"word ".repeat(120)}`;
		const cut = sentenceAround(long, ["spleen"]);
		expect(cut.length).toBeLessThan(340);
		expect(cut).toContain("spleen");
		expect(cut.startsWith("…")).toBe(true);
	});
});

describe("marked", () => {
	it("marks each phrase asked about, in any case", () => {
		expect(
			marked("The ruling part, and the Ruling Part.", ["ruling part"]),
		).toEqual([
			{ text: "The ", mark: false },
			{ text: "ruling part", mark: true },
			{ text: ", and the ", mark: false },
			{ text: "Ruling Part", mark: true },
			{ text: ".", mark: false },
		]);
	});
});
