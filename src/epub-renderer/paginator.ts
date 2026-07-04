import type { Block, Inline } from "./types";

export interface PaginatorConfig {
	pageHeight: number;
	pageWidth: number;
	titleHeight?: number;
	containerPaddingY?: number;
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

export function paginate(blocks: Block[], config: PaginatorConfig): PageResult {
	const baseFontSize = 16;
	const fontSizePx = baseFontSize * (config.fontSize / 100);
	const lineHeightPx = fontSizePx * config.lineHeight;

	const availableHeight =
		config.pageHeight -
		(config.titleHeight ?? 0) -
		(config.containerPaddingY ?? 0);
	// Safety buffer of 1 line to prevent text cutting
	const linesPerPage = Math.max(
		Math.floor(availableHeight / lineHeightPx) - 1,
		1,
	);

	const contentWidthPx = config.pageWidth - config.hPadding * 16 * 2;
	// Conservative 0.6em avg char width (wider chars = fewer/line = safer)
	const avgCharWidth = fontSizePx * 0.6;
	const charsPerLine = Math.max(Math.floor(contentWidthPx / avgCharWidth), 1);
	const wordsPerLine = Math.max(Math.floor(charsPerLine / 5), 1);

	const cumulativeLines = calculateBlockLines(
		blocks,
		wordsPerLine,
		linesPerPage,
	);
	const splits = splitIntoPages(blocks.length, cumulativeLines, linesPerPage);
	const pages = splits.map((indices) => indices.map((i) => blocks[i]));
	return { pages, totalPages: pages.length };
}

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

function calculateBlockLines(
	blocks: Block[],
	wordsPerLine: number,
	linesPerPage: number,
): number[] {
	const cumulative: number[] = [];
	let total = 0;

	for (const block of blocks) {
		const lines = estimateBlockLines(block, wordsPerLine, linesPerPage);
		total += lines;
		cumulative.push(total);
	}

	return cumulative;
}

function extractText(inlines: Inline[]): string {
	let text = "";
	for (const inline of inlines) {
		switch (inline.type) {
			case "text":
				text += inline.content + " ";
				break;
			case "strong":
			case "bold":
			case "emphasis":
			case "italic":
			case "underline":
			case "strikethrough":
			case "superscript":
			case "subscript":
				text += extractText(inline.children);
				break;
			case "link":
				text += extractText(inline.children);
				break;
			case "lineBreak":
				text += " ";
				break;
			case "image":
			case "code":
				break;
		}
	}
	return text.trim();
}

function wordCount(text: string): number {
	if (!text.trim()) return 0;
	return text.split(/\s+/).length;
}

function estimateBlockLines(
	block: Block,
	wordsPerLine: number,
	linesPerPage: number,
): number {
	switch (block.type) {
		case "paragraph": {
			const words = wordCount(extractText(block.children));
			if (words === 0) return 0;
			// text lines + 1 line for margin-bottom
			return Math.max(Math.ceil(words / wordsPerLine), 1) + 1;
		}

		case "heading": {
			const words = wordCount(extractText(block.children));
			const textLines =
				words === 0 ? 0 : Math.max(Math.ceil(words / wordsPerLine), 1);
			return textLines + 2;
		}

		case "image":
			return Math.max(Math.floor(linesPerPage * 0.4), 3);

		case "list":
			if (block.items.length === 0) return 0;
			return block.items.reduce((sum, item) => {
				if (item.children.length === 0) return sum + 1;
				return (
					sum +
					item.children.reduce(
						(s, child) =>
							s + estimateBlockLines(child, wordsPerLine, linesPerPage),
						0,
					)
				);
			}, 0);

		case "blockquote":
			if (block.children.length === 0) return 1;
			return block.children.reduce(
				(sum, child) =>
					sum + estimateBlockLines(child, wordsPerLine, linesPerPage),
				1,
			);

		case "code":
		case "pre":
			return block.content.split("\n").length + 2;

		case "horizontalRule":
			return 1;

		case "table":
			return block.rows.length + 2;
	}
}
