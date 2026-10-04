import { describe, expect, it } from "vitest";
import { readerAction } from "./reader-keys";

describe("readerAction", () => {
	it("pages with the arrows, J and K, and Space", () => {
		expect(readerAction("ArrowDown")).toBe("next");
		expect(readerAction("j")).toBe("next");
		expect(readerAction("PageDown")).toBe("next");
		expect(readerAction(" ")).toBe("next");
		expect(readerAction("ArrowUp")).toBe("previous");
		expect(readerAction("k")).toBe("previous");
		expect(readerAction("PageUp")).toBe("previous");
	});

	it("pages back on Shift and Space", () => {
		expect(readerAction(" ", true)).toBe("previous");
	});

	it("runs the rail's controls by letter, in either case", () => {
		expect(readerAction("c")).toBe("contents");
		expect(readerAction("E")).toBe("explain");
		expect(readerAction("t")).toBe("settings");
		expect(readerAction("S")).toBe("save");
		expect(readerAction("l")).toBe("dim");
	});

	it("leaves on Escape and ignores every other key", () => {
		expect(readerAction("Escape")).toBe("leave");
		expect(readerAction("x")).toBeUndefined();
		expect(readerAction("Enter")).toBeUndefined();
		expect(readerAction("Tab")).toBeUndefined();
	});
});
