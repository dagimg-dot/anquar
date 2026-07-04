import type { TypographyConfig } from "./styles";
import { mergeTypography } from "./styles";
import type { Block, Inline } from "./types";

export interface PaginatorConfig {
	pageHeight: number;
	pageWidth: number;
	titleHeight?: number;
	typography?: Partial<TypographyConfig>;
	fontSize: number;
	lineHeight: number;
	hPadding: number;
	textColor: string;
	bgColor: string;
}

export interface PageResult {
	pages: Block[][];
	totalPages: number;
}

/**
 * Split blocks into viewport-height pages.
 * Uses a hidden DOM measurer to get accurate heights.
 */
export function paginate(blocks: Block[], config: PaginatorConfig): PageResult {
	const styles = mergeTypography(config.typography);
	const heights = measureBlockHeights(blocks, config, styles);
	// Subtract title height — it takes space on the first snap-page
	const pageHeight = config.pageHeight - (config.titleHeight ?? 0);
	const splits = splitIntoPages(blocks.length, heights, pageHeight);
	const pages = splits.map((indices) => indices.map((i) => blocks[i]));
	return { pages, totalPages: pages.length };
}

// --- Measurement ---

function measureBlockHeights(
	blocks: Block[],
	config: PaginatorConfig,
	styles: TypographyConfig,
): number[] {
	const measurer = createMeasurer(config, styles);
	const heights: number[] = [];
	document.body.appendChild(measurer);

	for (const block of blocks) {
		const el = createBlockElement(block, config, styles);
		measurer.appendChild(el);
		heights.push(measurer.scrollHeight);
	}

	measurer.remove();
	return heights;
}

function createMeasurer(
	config: PaginatorConfig,
	styles: TypographyConfig,
): HTMLDivElement {
	const el = document.createElement("div");
	el.style.cssText = [
		"position: fixed",
		"left: -9999px",
		"top: 0",
		`width: ${config.pageWidth}px`,
		"visibility: hidden",
		"pointer-events: none",
		`font-family: ${styles.fontFamily ?? ""}`,
		`font-size: ${config.fontSize}%`,
		`line-height: ${config.lineHeight}`,
		`color: ${config.textColor}`,
		`background: ${config.bgColor}`,
		"word-spacing: normal",
		"letter-spacing: normal",
	].join(";");
	return el;
}

// --- Page splitting ---

export function splitIntoPages(
	blockCount: number,
	cumulativeHeights: number[],
	pageHeight: number,
): number[][] {
	const pages: number[][] = [];
	let currentPage: number[] = [];
	let currentPageStartHeight = 0;

	for (let i = 0; i < blockCount; i++) {
		const blockHeight =
			i === 0
				? cumulativeHeights[0]
				: cumulativeHeights[i] - cumulativeHeights[i - 1];

		const pageUsedSpace =
			i === 0
				? cumulativeHeights[0]
				: cumulativeHeights[i - 1] - currentPageStartHeight;

		// Start a new page if adding this block would overflow
		// BUT don't start a new page if this is the first block on the page
		if (currentPage.length > 0 && pageUsedSpace + blockHeight > pageHeight) {
			pages.push(currentPage);
			currentPage = [];
			currentPageStartHeight = i === 0 ? 0 : cumulativeHeights[i - 1];
		}

		currentPage.push(i);
	}

	if (currentPage.length > 0) {
		pages.push(currentPage);
	}

	return pages;
}

// --- Block → HTML element creation ---

function createBlockElement(
	block: Block,
	config: PaginatorConfig,
	styles: TypographyConfig,
): HTMLElement {
	switch (block.type) {
		case "paragraph":
			return createParagraph(block, config, styles);
		case "heading":
			return createHeading(block, styles);
		case "list":
			return createList(block, config, styles);
		case "blockquote":
			return createBlockquote(block, config, styles);
		case "image":
			return createImage(block, styles);
		case "code":
		case "pre":
			return createPre(block, styles);
		case "horizontalRule":
			return createHr(styles);
		case "table":
			return createTable(block, config, styles);
	}
}

function createParagraph(
	block: Block & { type: "paragraph" },
	config: PaginatorConfig,
	styles: TypographyConfig,
): HTMLParagraphElement {
	const p = document.createElement("p");
	p.style.cssText = [
		`margin: 0 0 ${styles.paragraph?.marginBottom ?? "1em"} 0`,
		`text-indent: ${styles.paragraph?.textIndent ?? "0"}`,
		`font-size: ${config.fontSize}%`,
		`line-height: ${config.lineHeight}`,
		"padding-left: 0",
		"padding-right: 0",
	].join(";");
	p.append(...renderInlineChildren(block.children));
	return p;
}

function createHeading(
	block: Block & { type: "heading" },
	styles: TypographyConfig,
): HTMLHeadingElement {
	const h = styles.heading?.[block.level] ?? {};
	const tag = `h${block.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
	const el = document.createElement(tag);
	el.style.cssText = [
		`font-size: ${h.fontSize ?? "1em"}`,
		`font-weight: ${h.fontWeight ?? "bold"}`,
		`line-height: ${h.lineHeight ?? "1.3"}`,
		`margin: ${h.marginTop ?? "0"} 0 ${h.marginBottom ?? "0"} 0`,
		"padding: 0",
	].join(";");
	el.append(...renderInlineChildren(block.children));
	return el;
}

function createList(
	block: Block & { type: "list" },
	config: PaginatorConfig,
	styles: TypographyConfig,
): HTMLElement {
	const tag = block.ordered ? "ol" : "ul";
	const el = document.createElement(tag);
	el.style.cssText = [
		`padding-left: ${styles.list?.paddingLeft ?? "1.5em"}`,
		`margin: 0 0 ${styles.list?.marginBottom ?? "1em"} 0`,
	].join(";");

	for (const item of block.items) {
		const li = document.createElement("li");
		for (const child of item.children) {
			li.append(createBlockElement(child, config, styles));
		}
		el.append(li);
	}
	return el;
}

function createBlockquote(
	block: Block & { type: "blockquote" },
	config: PaginatorConfig,
	styles: TypographyConfig,
): HTMLElement {
	const el = document.createElement("blockquote");
	const bq = styles.blockquote ?? {};
	el.style.cssText = [
		`margin: 1em 0 1em ${bq.marginLeft ?? "1.5em"}`,
		`font-style: ${bq.fontStyle ?? "italic"}`,
		`border-left: ${bq.borderLeft ?? "2px solid"}`,
		"padding-left: 0.8em",
	].join(";");
	for (const child of block.children) {
		el.append(createBlockElement(child, config, styles));
	}
	return el;
}

function createImage(
	block: Block & { type: "image" },
	styles: TypographyConfig,
): HTMLImageElement {
	const img = document.createElement("img");
	img.src = block.src;
	img.alt = block.alt;
	img.style.cssText = [
		`max-width: ${styles.image?.maxWidth ?? "100%"}`,
		`margin: ${styles.image?.marginTop ?? "1em"} 0 ${styles.image?.marginBottom ?? "1em"} 0`,
		"display: block",
	].join(";");
	return img;
}

function createPre(
	block: Block & { type: "code" | "pre" },
	styles: TypographyConfig,
): HTMLPreElement {
	const el = document.createElement("pre");
	const pre = styles.pre ?? {};
	el.style.cssText = [
		`font-family: ${pre.fontFamily ?? "monospace"}`,
		`font-size: ${pre.fontSize ?? "0.9em"}`,
		`line-height: ${pre.lineHeight ?? "1.5"}`,
		`padding: ${pre.padding ?? "1em"}`,
		`border-radius: ${pre.borderRadius ?? "8px"}`,
		"white-space: pre-wrap",
		"margin: 0",
	].join(";");
	el.textContent = block.content;
	return el;
}

function createHr(styles: TypographyConfig): HTMLHRElement {
	const el = document.createElement("hr");
	const hr = styles.horizontalRule ?? {};
	el.style.cssText = [
		`margin: ${hr.marginTop ?? "1.5em"} 0 ${hr.marginBottom ?? "1.5em"} 0`,
		"border: none",
		"border-top: 1px solid currentColor",
	].join(";");
	return el;
}

function createTable(
	block: Block & { type: "table" },
	config: PaginatorConfig,
	styles: TypographyConfig,
): HTMLTableElement {
	const table = document.createElement("table");
	const t = styles.table ?? {};
	table.style.cssText = [
		`font-size: ${t.fontSize ?? "0.95em"}`,
		`border-collapse: ${t.borderCollapse ?? "collapse"}`,
		"width: 100%",
	].join(";");

	const tbody = document.createElement("tbody");
	for (const row of block.rows) {
		const tr = document.createElement("tr");
		for (const cell of row.cells) {
			const tag = cell.header ? "th" : "td";
			const el = document.createElement(tag);
			el.style.cssText = [
				"padding: 0.5em",
				`font-weight: ${cell.header ? "bold" : "normal"}`,
				"text-align: left",
				"border-bottom: 1px solid currentColor",
			].join(";");
			for (const child of cell.children) {
				el.append(createBlockElement(child, config, styles));
			}
			tr.append(el);
		}
		tbody.append(tr);
	}
	table.append(tbody);
	return table;
}

// --- Inline → text/HTML rendering ---

function renderInlineChildren(children: Inline[]): (Text | HTMLElement)[] {
	return children.map((inline) => renderInline(inline));
}

function renderInline(inline: Inline): Text | HTMLElement {
	switch (inline.type) {
		case "text":
			return document.createTextNode(inline.content);

		case "strong":
		case "bold": {
			const el = document.createElement("strong");
			el.append(...renderInlineChildren(inline.children));
			return el;
		}

		case "emphasis":
		case "italic": {
			const el = document.createElement("em");
			el.append(...renderInlineChildren(inline.children));
			return el;
		}

		case "underline": {
			const el = document.createElement("u");
			el.append(...renderInlineChildren(inline.children));
			return el;
		}

		case "strikethrough": {
			const el = document.createElement("s");
			el.append(...renderInlineChildren(inline.children));
			return el;
		}

		case "superscript": {
			const el = document.createElement("sup");
			el.append(...renderInlineChildren(inline.children));
			return el;
		}

		case "subscript": {
			const el = document.createElement("sub");
			el.append(...renderInlineChildren(inline.children));
			return el;
		}

		case "code": {
			const el = document.createElement("code");
			el.textContent = inline.content;
			return el;
		}

		case "link": {
			const el = document.createElement("a");
			el.href = inline.href;
			el.append(...renderInlineChildren(inline.children));
			return el;
		}

		case "image": {
			const el = document.createElement("img");
			el.src = inline.src;
			el.alt = inline.alt;
			el.style.cssText =
				"max-width: 100%; display: inline-block; vertical-align: middle";
			return el;
		}

		case "lineBreak":
			return document.createElement("br");
	}
}
