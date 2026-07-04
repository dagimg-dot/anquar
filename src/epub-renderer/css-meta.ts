import type { EpubCssMeta, EpubFontFace } from "./types";

/**
 * Extract @font-face declarations, direction, and writing-mode
 * from EPUB CSS text and the chapter's HTML document.
 */
export function extractCssMeta(
	cssTexts: string[],
	htmlDoc: Document,
): EpubCssMeta {
	const fonts = extractFontFaces(cssTexts);
	const bodyFontFamily = extractBodyFontFamily(cssTexts);

	// Prefer HTML dir attribute, fall back to CSS
	let direction: EpubCssMeta["direction"];
	const htmlDir = htmlDoc.documentElement.getAttribute("dir");
	if (htmlDir === "rtl" || htmlDir === "ltr") {
		direction = htmlDir;
	} else {
		direction = extractDirection(cssTexts);
	}

	const writingMode =
		extractWritingMode(htmlDoc) ?? extractCssWritingMode(cssTexts);

	return { fonts, bodyFontFamily, direction, writingMode };
}

// --- @font-face extraction ---

function extractFontFaces(cssTexts: string[]): EpubFontFace[] {
	const fonts: EpubFontFace[] = [];
	for (const css of cssTexts) {
		// Match @font-face blocks — handle multi-line, multi-font
		const blockRegex = /@font-face\s*\{([^}]+)\}/gi;
		let match: RegExpExecArray | null;
		match = blockRegex.exec(css);
		while (match !== null) {
			const block = match[1];
			const font = parseFontFaceBlock(block);
			if (font) fonts.push(font);
			match = blockRegex.exec(css);
		}
	}

	// Deduplicate by family + src
	const seen = new Set<string>();
	return fonts.filter((f) => {
		const key = `${f.family}|${f.src}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function parseFontFaceBlock(block: string): EpubFontFace | null {
	const family = extractProp(block, "font-family");
	const src = extractFontSrc(block);
	if (!family || !src) return null;

	return {
		family: unquote(family),
		src,
		style: extractProp(block, "font-style") || undefined,
		weight: extractProp(block, "font-weight") || undefined,
	};
}

function extractProp(css: string, prop: string): string | null {
	const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`, "i");
	const match = regex.exec(css);
	return match ? match[1].trim() : null;
}

function extractFontSrc(block: string): string | null {
	// Match url(...) or url("...") or url('...')
	const regex = /url\s*\(\s*["']?([^"'\s)]+)["']?\s*\)/i;
	const match = regex.exec(block);
	return match ? match[1] : null;
}

function unquote(s: string): string {
	return s.replace(/^["']|["']$/g, "");
}

// --- body font-family extraction ---

function extractBodyFontFamily(cssTexts: string[]): string | undefined {
	for (const css of cssTexts) {
		// Match body { font-family: ... }
		const regex = /body\s*\{[^}]*font-family\s*:\s*([^;}]+)/i;
		const match = regex.exec(css);
		if (match) {
			return unquote(match[1].trim());
		}
	}
	return undefined;
}

// --- direction extraction from CSS ---

function extractDirection(cssTexts: string[]): EpubCssMeta["direction"] {
	for (const css of cssTexts) {
		if (/direction\s*:\s*rtl/i.test(css)) return "rtl";
		if (/direction\s*:\s*ltr/i.test(css)) return "ltr";
	}
	return undefined;
}

// --- writing-mode extraction ---

function extractWritingMode(doc: Document): string | undefined {
	const html = doc.documentElement;
	// Check inline style
	const style = html.getAttribute("style");
	if (style) {
		const match = /writing-mode\s*:\s*([^;]+)/i.exec(style);
		if (match) return match[1].trim();
	}
	return undefined;
}

function extractCssWritingMode(cssTexts: string[]): string | undefined {
	for (const css of cssTexts) {
		const match = /writing-mode\s*:\s*([^;]+)/i.exec(css);
		if (match) return match[1].trim();
	}
	return undefined;
}
