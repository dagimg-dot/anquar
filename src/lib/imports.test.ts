import { describe, expect, it } from "vitest";
import { readingTime } from "./imports.ts";

describe("readingTime", () => {
	it("gives short books in five-minute steps, never under five", () => {
		expect(readingTime(100)).toBe("about 5 min");
		expect(readingTime(238 * 22)).toBe("about 20 min");
	});

	it("gives long books in hours", () => {
		expect(readingTime(238 * 60 * 4.2)).toBe("about 4 h");
		expect(readingTime(238 * 56)).toBe("about 1 h");
	});
});
