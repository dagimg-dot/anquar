import { describe, expect, it } from "vitest";
import { paginate, splitIntoPages } from "./paginator";
import type { Block } from "./types";

function p(text: string): Block {
	return {
		type: "paragraph",
		children: [{ type: "text" as const, content: text }],
	};
}

// --- splitIntoPages (pure logic, no DOM needed) ---

describe("splitIntoPages", () => {
	it("puts all blocks on one page if they fit", () => {
		// cumulative heights: [50, 100, 150]
		const pages = splitIntoPages(3, [50, 100, 150], 200);
		expect(pages).toHaveLength(1);
		expect(pages[0]).toEqual([0, 1, 2]);
	});

	it("splits when blocks exceed page height", () => {
		// cumulative heights: [50, 100, 200, 250]
		const pages = splitIntoPages(4, [50, 100, 200, 250], 150);
		expect(pages).toHaveLength(2);
		expect(pages[0]).toEqual([0, 1]); // first 2 blocks fit
		expect(pages[1]).toEqual([2, 3]); // rest on next page
	});

	it("handles single-block pages", () => {
		// each block individually exceeds page height
		const pages = splitIntoPages(3, [200, 400, 600], 150);
		expect(pages).toHaveLength(3);
		expect(pages[0]).toEqual([0]);
		expect(pages[1]).toEqual([1]);
		expect(pages[2]).toEqual([2]);
	});

	it("always puts at least one block on a page", () => {
		// First block overflows but should still be placed
		const pages = splitIntoPages(2, [300, 350], 200);
		expect(pages).toHaveLength(2);
		expect(pages[0]).toEqual([0]);
		expect(pages[1]).toEqual([1]);
	});

	it("returns empty array for no blocks", () => {
		const pages = splitIntoPages(0, [], 200);
		expect(pages).toEqual([]);
	});

	it("handles exact fit", () => {
		// cumulative: [100, 200, 300]
		const pages = splitIntoPages(3, [100, 200, 300], 100);
		expect(pages).toHaveLength(3);
	});
});

// --- paginate (end-to-end with DOM measurement) ---

describe("paginate", () => {
	it("returns one page for a few short blocks", () => {
		const result = paginate([p("Hello"), p("World")], {
			pageHeight: 1000,
			pageWidth: 400,
			fontSize: 100,
			lineHeight: 1.7,
			hPadding: 0,
			textColor: "#000",
			bgColor: "#fff",
		});
		expect(result.totalPages).toBe(1);
		expect(result.pages[0]).toHaveLength(2);
	});

	it("handles paginate without error", () => {
		const manyParagraphs = Array.from({ length: 50 }, (_, i) =>
			p(`Paragraph ${i + 1}`),
		);
		const result = paginate(manyParagraphs, {
			pageHeight: 100,
			pageWidth: 400,
			fontSize: 100,
			lineHeight: 1.7,
			hPadding: 0,
			textColor: "#000",
			bgColor: "#fff",
		});
		expect(result.totalPages).toBeGreaterThanOrEqual(1);
	});

	it("matches total block count across pages", () => {
		const blocks = [p("A"), p("B"), p("C"), p("D"), p("E")];
		const result = paginate(blocks, {
			pageHeight: 200,
			pageWidth: 400,
			fontSize: 100,
			lineHeight: 1.7,
			hPadding: 0,
			textColor: "#000",
			bgColor: "#fff",
		});
		const flat = result.pages.flat();
		expect(flat).toHaveLength(5);
	});

	it("handles empty block list", () => {
		const result = paginate([], {
			pageHeight: 1000,
			pageWidth: 400,
			fontSize: 100,
			lineHeight: 1.7,
			hPadding: 0,
			textColor: "#000",
			bgColor: "#fff",
		});
		expect(result.totalPages).toBe(0);
		expect(result.pages).toEqual([]);
	});
});

// --- verify export ---

describe("exports", () => {
	it("exports paginate and splitIntoPages", async () => {
		const mod = await import("./paginator");
		expect(typeof mod.paginate).toBe("function");
		expect(typeof mod.splitIntoPages).toBe("function");
	});
});
