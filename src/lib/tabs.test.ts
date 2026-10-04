import { describe, expect, it } from "vitest";
import { tabForKey } from "./tabs";

describe("tabForKey", () => {
	it("opens the tabs in the order of the bar", () => {
		expect(tabForKey("1")).toBe("feed");
		expect(tabForKey("2")).toBe("library");
		expect(tabForKey("3")).toBe("saved");
		expect(tabForKey("4")).toBe("settings");
	});

	it("has nothing for a number past the last tab, or for other keys", () => {
		expect(tabForKey("5")).toBeUndefined();
		expect(tabForKey("0")).toBeUndefined();
		expect(tabForKey("a")).toBeUndefined();
		expect(tabForKey("12")).toBeUndefined();
	});
});
