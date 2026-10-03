import { describe, expect, it } from "vitest";
import { newer, RELEASES, releasesAfter, VERSION } from "./changelog";

describe("newer", () => {
	it("compares number by number", () => {
		expect(newer("0.1.10", "0.1.9")).toBe(true);
		expect(newer("0.1.9", "0.1.10")).toBe(false);
		expect(newer("0.2.0", "0.1.12")).toBe(true);
	});

	it("reads a missing number as 0", () => {
		expect(newer("0.1.0", "0.1")).toBe(false);
		expect(newer("0.1.1", "0.1")).toBe(true);
	});

	it("is false for the same version", () => {
		expect(newer(VERSION, VERSION)).toBe(false);
	});
});

describe("releasesAfter", () => {
	it("keeps the releases after the one last seen, newest first", () => {
		const releases = RELEASES.slice(0, 3);
		expect(releasesAfter(releases[2].version, releases)).toEqual(
			releases.slice(0, 2),
		);
		expect(releasesAfter(VERSION)).toEqual([]);
	});
});

// The list is written by hand, so its order and shape are checked here rather than trusted.
describe("RELEASES", () => {
	it("runs newest first, in versions and in dates", () => {
		for (let i = 1; i < RELEASES.length; i++) {
			expect(newer(RELEASES[i - 1].version, RELEASES[i].version)).toBe(true);
			expect(RELEASES[i - 1].date >= RELEASES[i].date).toBe(true);
		}
	});

	it("gives every release a three-part version, a real date, a title and notes", () => {
		for (const r of RELEASES) {
			expect(r.version).toMatch(/^\d+\.\d+\.\d+$/);
			expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(Number.isNaN(Date.parse(r.date))).toBe(false);
			expect(r.title.trim()).not.toBe("");
			expect(r.notes.length).toBeGreaterThan(0);
			for (const note of r.notes) expect(note.trim()).not.toBe("");
		}
	});

	it("takes the app's version from the newest release", () => {
		expect(VERSION).toBe(RELEASES[0].version);
	});
});
