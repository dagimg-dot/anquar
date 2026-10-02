import { describe, expect, it } from "vitest";
import { PageText, span } from "./text-pick.ts";

function page(html: string) {
	const root = document.createElement("section");
	root.innerHTML = html;
	return new PageText(root);
}

const pickText = (text: PageText, from: string, to = from) => {
	const word = (w: string) =>
		text.words.find((x) => text.text.slice(x.start, x.end) === w);
	const a = word(from);
	const b = word(to);
	if (!a || !b) throw new Error(`no word ${from} or ${to}`);
	const { start, end } = span(a, b);
	return text.text.slice(start, end);
};

describe("PageText", () => {
	it("reads a styled run as part of its paragraph", () => {
		const text = page("<p>Call me <em>Ishmael</em>. Some years ago</p>");
		expect(text.text).toBe("Call me Ishmael. Some years ago");
		expect(pickText(text, "Ishmael")).toBe("Ishmael");
	});

	it("keeps paragraphs apart, so no word runs from one into the next", () => {
		const text = page("<h2>Loomings</h2><p>Call me Ishmael.</p>");
		expect(text.text).toBe("Loomings\nCall me Ishmael.");
		expect(pickText(text, "Loomings", "Call")).toBe("Loomings\nCall");
	});

	it("leaves out what the page marks as not text", () => {
		const text = page(
			"<ul><li><span data-pick-skip>1.</span><span>First</span></li><li><span data-pick-skip>2.</span><span>Second</span></li></ul>",
		);
		expect(text.text).toBe("First\nSecond");
	});

	it("picks one word bare and a passage with its punctuation", () => {
		const text = page("<p>“Call me Ishmael.” Some years ago—never mind.</p>");
		expect(pickText(text, "Ishmael")).toBe("Ishmael");
		expect(pickText(text, "Call", "Ishmael")).toBe("“Call me Ishmael.”");
		expect(pickText(text, "Ishmael", "Call")).toBe("“Call me Ishmael.”");
		expect(pickText(text, "years", "never")).toBe("years ago—never");
	});

	it("finds the nearest word to an offset between words", () => {
		const text = page("<p>one  two</p>");
		const at = (offset: number) => {
			const w = text.wordNear(offset);
			return w && text.text.slice(w.start, w.end);
		};
		expect(at(1)).toBe("one");
		expect(at(3)).toBe("one");
		expect(at(4)).toBe("two");
		expect(at(99)).toBe("two");
	});

	it("maps a pick back onto the page's own text nodes", () => {
		const text = page("<p>Call me <em>Ishmael</em>.</p><p>Some years</p>");
		const from = text.text.indexOf("me");
		const to = text.text.indexOf("Some") + 4;
		expect(text.range(from, to).toString()).toBe("me Ishmael.Some");
	});
});
