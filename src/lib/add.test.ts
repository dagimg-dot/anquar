import { describe, expect, it } from "vitest";
import { wasDownloading } from "./add";

describe("wasDownloading", () => {
	it("is no for a glance at another app", () => {
		expect(wasDownloading(3_000)).toBe(false);
	});

	it("is yes for a few seconds to an hour away", () => {
		expect(wasDownloading(10_000)).toBe(true);
		expect(wasDownloading(5 * 60 * 1000)).toBe(true);
		expect(wasDownloading(60 * 60 * 1000)).toBe(true);
	});

	it("is no for a day away, by when the errand is forgotten", () => {
		expect(wasDownloading(24 * 60 * 60 * 1000)).toBe(false);
	});
});
