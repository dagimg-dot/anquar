import { describe, expect, it } from "vitest";
import { parseChapter } from "./parser";
import type { Block, Inline } from "./types";

function p(text: string): Block {
	return {
		type: "paragraph",
		children: [{ type: "text" as const, content: text }],
	};
}

function inline(html: string): Inline {
	const blocks = parseChapter(html);
	const block = blocks[0];
	if (block?.type !== "paragraph") throw new Error("Expected paragraph block");
	return block.children[0];
}

function inlines(html: string): Inline[] {
	const blocks = parseChapter(html);
	const block = blocks[0];
	if (block?.type !== "paragraph") throw new Error("Expected paragraph block");
	return block.children;
}

describe("paragraphs", () => {
	it("parses a simple paragraph", () => {
		expect(parseChapter("<p>Hello world</p>")).toEqual([p("Hello world")]);
	});

	it("parses multiple paragraphs", () => {
		const blocks = parseChapter("<p>First</p><p>Second</p>");
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toMatchObject({ type: "paragraph" });
		expect(blocks[1]).toMatchObject({ type: "paragraph" });
	});

	it("handles empty paragraph", () => {
		expect(parseChapter("<p></p>")).toEqual([
			{ type: "paragraph", children: [] },
		]);
	});
});

describe("headings", () => {
	for (const level of [1, 2, 3, 4, 5, 6] as const) {
		it(`parses h${level}`, () => {
			expect(parseChapter(`<h${level}>Title</h${level}>`)).toEqual([
				{
					type: "heading",
					level,
					children: [{ type: "text", content: "Title" }],
				},
			]);
		});
	}

	it("parses heading with inline formatting", () => {
		expect(parseChapter("<h2><em>Chapter</em> 1</h2>")).toEqual([
			{
				type: "heading",
				level: 2,
				children: [
					{
						type: "emphasis",
						children: [{ type: "text", content: "Chapter" }],
					},
					{ type: "text", content: " 1" },
				],
			},
		]);
	});
});

describe("inline formatting", () => {
	it("parses bold via <strong>", () => {
		expect(inline("<p><strong>bold</strong></p>")).toEqual({
			type: "strong",
			children: [{ type: "text", content: "bold" }],
		});
	});

	it("parses bold via <b>", () => {
		expect(inline("<p><b>bold</b></p>")).toEqual({
			type: "strong",
			children: [{ type: "text", content: "bold" }],
		});
	});

	it("parses italic via <em>", () => {
		expect(inline("<p><em>italic</em></p>")).toEqual({
			type: "emphasis",
			children: [{ type: "text", content: "italic" }],
		});
	});

	it("parses italic via <i>", () => {
		expect(inline("<p><i>italic</i></p>")).toEqual({
			type: "emphasis",
			children: [{ type: "text", content: "italic" }],
		});
	});

	it("parses underline", () => {
		expect(inline("<p><u>underlined</u></p>")).toEqual({
			type: "underline",
			children: [{ type: "text", content: "underlined" }],
		});
	});

	it("parses strikethrough via <s>", () => {
		expect(inline("<p><s>struck</s></p>")).toEqual({
			type: "strikethrough",
			children: [{ type: "text", content: "struck" }],
		});
	});

	it("parses strikethrough via <del>", () => {
		expect(inline("<p><del>deleted</del></p>")).toEqual({
			type: "strikethrough",
			children: [{ type: "text", content: "deleted" }],
		});
	});

	it("parses superscript", () => {
		expect(inline("<p><sup>1</sup></p>")).toEqual({
			type: "superscript",
			children: [{ type: "text", content: "1" }],
		});
	});

	it("parses subscript", () => {
		expect(inline("<p><sub>2</sub></p>")).toEqual({
			type: "subscript",
			children: [{ type: "text", content: "2" }],
		});
	});

	it("parses inline code", () => {
		expect(inline("<p><code>const x = 1;</code></p>")).toEqual({
			type: "code",
			content: "const x = 1;",
		});
	});

	it("parses line break", () => {
		expect(inlines("<p>line1<br/>line2</p>")).toEqual([
			{ type: "text", content: "line1" },
			{ type: "lineBreak" },
			{ type: "text", content: "line2" },
		]);
	});

	it("merges adjacent text nodes", () => {
		expect(inlines("<p>Hello <strong>world</strong></p>")).toEqual([
			{ type: "text", content: "Hello " },
			{
				type: "strong",
				children: [{ type: "text", content: "world" }],
			},
		]);
	});

	it("handles mixed inline formatting", () => {
		expect(
			inlines("<p><strong>Bold</strong> and <em>italic</em> text</p>"),
		).toEqual([
			{ type: "strong", children: [{ type: "text", content: "Bold" }] },
			{ type: "text", content: " and " },
			{ type: "emphasis", children: [{ type: "text", content: "italic" }] },
			{ type: "text", content: " text" },
		]);
	});
});

describe("links", () => {
	it("parses link with href", () => {
		expect(inline('<p><a href="https://example.com">link</a></p>')).toEqual({
			type: "link",
			href: "https://example.com",
			children: [{ type: "text", content: "link" }],
		});
	});

	it("handles link without href", () => {
		expect(inline("<p><a>link</a></p>")).toEqual({
			type: "link",
			href: "",
			children: [{ type: "text", content: "link" }],
		});
	});
});

describe("images", () => {
	it("parses inline image", () => {
		expect(inline('<p><img src="pic.jpg" alt="Photo"/></p>')).toEqual({
			type: "image",
			src: "pic.jpg",
			alt: "Photo",
		});
	});

	it("parses standalone image as paragraph", () => {
		expect(parseChapter('<img src="cover.jpg" alt="Cover"/>')).toEqual([
			{
				type: "paragraph",
				children: [{ type: "image", src: "cover.jpg", alt: "Cover" }],
			},
		]);
	});
});

describe("lists", () => {
	it("parses unordered list", () => {
		expect(parseChapter("<ul><li>One</li><li>Two</li></ul>")).toEqual([
			{
				type: "list",
				ordered: false,
				items: [{ children: [p("One")] }, { children: [p("Two")] }],
			},
		]);
	});

	it("parses ordered list", () => {
		expect(parseChapter("<ol><li>First</li></ol>")).toEqual([
			{
				type: "list",
				ordered: true,
				items: [{ children: [p("First")] }],
			},
		]);
	});

	it("parses nested list", () => {
		const blocks = parseChapter(
			"<ul><li>One<ul><li>Nested</li></ul></li></ul>",
		);
		expect(blocks[0]).toMatchObject({ type: "list", ordered: false });
	});
});

describe("blockquotes", () => {
	it("parses blockquote with paragraph", () => {
		expect(parseChapter("<blockquote><p>A quote</p></blockquote>")).toEqual([
			{
				type: "blockquote",
				children: [p("A quote")],
			},
		]);
	});

	it("parses blockquote with multiple paragraphs", () => {
		const blocks = parseChapter(
			"<blockquote><p>First</p><p>Second</p></blockquote>",
		);
		expect(blocks[0]).toMatchObject({ type: "blockquote" });
		expect((blocks[0] as { children: Block[] }).children).toHaveLength(2);
	});
});

describe("code blocks", () => {
	it("parses <pre> as code block", () => {
		expect(parseChapter("<pre>const x = 1;\nconsole.log(x);</pre>")).toEqual([
			{
				type: "pre",
				content: "const x = 1;\nconsole.log(x);",
			},
		]);
	});
});

describe("horizontal rules", () => {
	it("parses <hr/>", () => {
		expect(parseChapter("<hr/>")).toEqual([{ type: "horizontalRule" }]);
	});
});

describe("tables", () => {
	it("parses simple table", () => {
		const html =
			"<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>";
		expect(parseChapter(html)).toEqual([
			{
				type: "table",
				rows: [
					{
						cells: [
							{ header: false, children: [p("A")] },
							{ header: false, children: [p("B")] },
						],
					},
					{
						cells: [
							{ header: false, children: [p("C")] },
							{ header: false, children: [p("D")] },
						],
					},
				],
			},
		]);
	});

	it("parses table with header cells", () => {
		const blocks = parseChapter(
			"<table><tr><th>Name</th><th>Value</th></tr></table>",
		);
		const table = blocks[0] as {
			rows: Array<{ cells: Array<{ header: boolean }> }>;
		};
		expect(table.rows[0].cells[0].header).toBe(true);
		expect(table.rows[0].cells[1].header).toBe(true);
	});
});

describe("whitespace handling", () => {
	it("collapses multiple spaces", () => {
		expect(inlines("<p>Hello    world</p>")).toEqual([
			{ type: "text", content: "Hello world" },
		]);
	});

	it("handles leading/trailing whitespace", () => {
		expect(inlines("<p>  Hello world  </p>")).toEqual([
			{ type: "text", content: " Hello world " },
		]);
	});

	it("handles newlines in text", () => {
		expect(inlines("<p>Hello\nworld</p>")).toEqual([
			{ type: "text", content: "Hello world" },
		]);
	});
});

describe("container flattening", () => {
	it("flattens <div> wrapper", () => {
		expect(parseChapter("<div><p>Inside</p></div>")).toEqual([p("Inside")]);
	});

	it("flattens <section> wrapper", () => {
		const blocks = parseChapter("<section><p>Content</p></section>");
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toMatchObject({ type: "paragraph" });
	});

	it("flattens nested containers", () => {
		const blocks = parseChapter("<div><section><p>Deep</p></section></div>");
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toMatchObject({ type: "paragraph" });
	});
});

describe("document-level text", () => {
	it("wraps bare text in paragraph", () => {
		expect(parseChapter("Hello world")).toEqual([p("Hello world")]);
	});

	it("handles text separated by block elements", () => {
		expect(parseChapter("Before<p>Middle</p>After")).toHaveLength(3);
	});
});

describe("empty content", () => {
	it("returns empty array for empty string", () => {
		expect(parseChapter("")).toEqual([]);
	});

	it("returns empty array for whitespace only", () => {
		expect(parseChapter("   ")).toEqual([]);
	});
});

describe("unknown tags", () => {
	it("recurses into unknown elements", () => {
		expect(parseChapter("<unknown>text</unknown>")).toEqual([p("text")]);
	});

	it("skips unknown elements with known children", () => {
		const blocks = parseChapter("<unknown><p>text</p></unknown>");
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toMatchObject({ type: "paragraph" });
	});
});

describe("semantically transparent inline tags", () => {
	it("passes through <span> children", () => {
		expect(inlines("<p><span>text</span></p>")).toEqual([
			{ type: "text", content: "text" },
		]);
	});

	it("passes through <q> children", () => {
		expect(inlines("<p><q>quote</q></p>")).toEqual([
			{ type: "text", content: "quote" },
		]);
	});
});

describe("real-world EPUB patterns", () => {
	it("parses a typical chapter mix", () => {
		const html = [
			"<h1>Chapter 1</h1>",
			"<p>The first <em>paragraph</em> with some <strong>bold</strong> text.</p>",
			"<blockquote><p>A wise quote.</p></blockquote>",
			"<p>More text after the quote.</p>",
			"<hr/>",
			"<p>Scene break.</p>",
		].join("\n");

		const blocks = parseChapter(html);
		expect(blocks).toHaveLength(6);
		expect(blocks[0]).toMatchObject({ type: "heading", level: 1 });
		expect(blocks[1]).toMatchObject({ type: "paragraph" });
		expect(blocks[2]).toMatchObject({ type: "blockquote" });
		expect(blocks[3]).toMatchObject({ type: "paragraph" });
		expect(blocks[4]).toMatchObject({ type: "horizontalRule" });
		expect(blocks[5]).toMatchObject({ type: "paragraph" });
	});

	it("parses EPUB with mixed inline formatting", () => {
		const html =
			"<p>Text with <b>bold</b>, <i>italic</i>, and <a href='#ref'>a link</a>.</p>";
		expect(inlines(html)).toHaveLength(7);
	});

	it("parses list items with inline formatting", () => {
		const blocks = parseChapter(
			"<ul><li><strong>Key:</strong> value</li></ul>",
		);
		const listItem = (blocks[0] as { items: Array<{ children: Block[] }> })
			.items[0];
		expect(listItem.children[0]).toMatchObject({ type: "paragraph" });
	});
});

describe("parseHtml alias", () => {
	it("is exported and works", async () => {
		const { parseHtml } = await import("./parser");
		expect(parseHtml("<p>text</p>")).toEqual([p("text")]);
	});
});
