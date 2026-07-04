import type {
	Block,
	Chapter,
	Inline,
	ListItem,
	TableCell,
	TableRow,
} from "./types";

const BLOCK_TAGS = new Set([
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"ul",
	"ol",
	"blockquote",
	"pre",
	"hr",
	"table",
]);

const CONTAINER_TAGS = new Set([
	"div",
	"section",
	"article",
	"main",
	"header",
	"footer",
	"nav",
	"aside",
	"body",
	"html",
	"head",
	"figure",
	"figcaption",
	"details",
	"summary",
]);

const INLINE_TAGS = new Set([
	"strong",
	"b",
	"em",
	"i",
	"u",
	"s",
	"del",
	"strike",
	"sup",
	"sub",
	"a",
	"code",
	"span",
	"q",
	"cite",
	"abbr",
	"small",
	"br",
	"img",
]);

const TABLE_TAGS = new Set(["table", "thead", "tbody", "tfoot"]);

export function parseChapter(html: string): Chapter {
	const doc = new DOMParser().parseFromString(html, "text/html");
	return parseBlocks(doc.body);
}

function parseBlocks(parent: Element): Block[] {
	const blocks: Block[] = [];

	for (const node of parent.childNodes) {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = (node as Text).textContent ?? "";
			if (!text.trim()) {
				continue;
			}
			blocks.push({
				type: "paragraph",
				children: [{ type: "text", content: text }],
			});
			continue;
		}

		if (node.nodeType !== Node.ELEMENT_NODE) {
			continue;
		}

		const el = node as Element;
		const tag = el.tagName.toLowerCase();

		if (BLOCK_TAGS.has(tag)) {
			const block = parseBlock(el, tag);
			if (block) {
				blocks.push(block);
			}
		} else if (CONTAINER_TAGS.has(tag)) {
			blocks.push(...parseBlocks(el));
		} else if (INLINE_TAGS.has(tag)) {
			if (tag === "img") {
				blocks.push({
					type: "paragraph",
					children: [
						{
							type: "image",
							src: el.getAttribute("src") ?? "",
							alt: el.getAttribute("alt") ?? "",
						},
					],
				});
			} else {
				blocks.push({
					type: "paragraph",
					children: parseInlineChildren(el),
				});
			}
		} else {
			// Unknown tag — recurse into children
			blocks.push(...parseBlocks(el));
		}
	}

	return blocks;
}

function parseBlock(el: Element, tag: string): Block | null {
	const cssClass = el.getAttribute("class") ?? undefined;

	switch (tag) {
		case "p":
			return { type: "paragraph", children: parseInlineChildren(el), cssClass };

		case "h1":
		case "h2":
		case "h3":
		case "h4":
		case "h5":
		case "h6":
			return {
				type: "heading",
				level: Number(tag[1]) as 1 | 2 | 3 | 4 | 5 | 6,
				children: parseInlineChildren(el),
				cssClass,
			};

		case "ul":
			return {
				type: "list",
				ordered: false,
				items: parseListItems(el),
				cssClass,
			};
		case "ol":
			return {
				type: "list",
				ordered: true,
				items: parseListItems(el),
				cssClass,
			};

		case "blockquote":
			return { type: "blockquote", children: parseBlocks(el), cssClass };

		case "pre":
			return { type: "pre", content: el.textContent ?? "", cssClass };

		case "hr":
			return { type: "horizontalRule" };

		case "table":
			return { type: "table", rows: parseTableBody(el) };

		default:
			return null;
	}
}

function parseListItems(listEl: Element): ListItem[] {
	const items: ListItem[] = [];
	for (const child of listEl.childNodes) {
		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue;
		}
		const tag = (child as Element).tagName.toLowerCase();
		if (tag === "li") {
			items.push({ children: parseBlocks(child as Element) });
		}
	}
	return items;
}

function parseTableBody(tableEl: Element): TableRow[] {
	const rows: TableRow[] = [];

	// Walk direct children: thead/tbody/tfoot/tr
	for (const child of tableEl.childNodes) {
		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue;
		}
		const el = child as Element;
		const tag = el.tagName.toLowerCase();

		if (tag === "tr") {
			rows.push({ cells: parseRowCells(el) });
		} else if (TABLE_TAGS.has(tag)) {
			rows.push(...parseTableBody(el));
		}
	}

	return rows;
}

function parseRowCells(trEl: Element): TableCell[] {
	const cells: TableCell[] = [];
	for (const child of trEl.childNodes) {
		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue;
		}
		const el = child as Element;
		const tag = el.tagName.toLowerCase();
		if (tag === "td" || tag === "th") {
			cells.push({
				header: tag === "th",
				children: parseBlocks(el),
			});
		}
	}
	return cells;
}

function parseInlineChildren(parent: Element): Inline[] {
	const result: Inline[] = [];
	for (const node of parent.childNodes) {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = (node as Text).textContent ?? "";
			const trimmed = collapseWhitespace(text);
			if (!trimmed) {
				continue;
			}

			// Merge adjacent text nodes
			const last = result.at(-1);
			if (last?.type === "text") {
				(last as { content: string }).content += trimmed;
			} else {
				result.push({ type: "text" as const, content: trimmed });
			}
			continue;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) {
			continue;
		}

		const el = node as Element;
		const tag = el.tagName.toLowerCase();
		const inner = parseInlineChildren(el);

		switch (tag) {
			case "b":
			case "strong":
				result.push({ type: "strong", children: inner });
				break;
			case "i":
			case "em":
				result.push({ type: "emphasis", children: inner });
				break;
			case "u":
				result.push({ type: "underline", children: inner });
				break;
			case "s":
			case "del":
			case "strike":
				result.push({ type: "strikethrough", children: inner });
				break;
			case "sup":
				result.push({ type: "superscript", children: inner });
				break;
			case "sub":
				result.push({ type: "subscript", children: inner });
				break;
			case "a":
				result.push({
					type: "link",
					href: el.getAttribute("href") ?? "",
					children: inner,
				});
				break;
			case "code":
				result.push({
					type: "code",
					content: collapseWhitespace(el.textContent ?? ""),
				});
				break;
			case "br":
				result.push({ type: "lineBreak" });
				break;
			case "img":
				result.push({
					type: "image",
					src: el.getAttribute("src") ?? "",
					alt: el.getAttribute("alt") ?? "",
				});
				break;
			case "span":
			case "q":
			case "cite":
			case "abbr":
			case "small":
				result.push(...inner);
				break;
			default:
				result.push(...inner);
				break;
		}
	}
	return result;
}

function collapseWhitespace(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

export function parseHtml(html: string): Chapter {
	return parseChapter(html);
}
