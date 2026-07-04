import type { ClassMap, EpubCssMeta, EpubFontFace } from "./types";

const SAFE_PROPERTIES = new Set([
	"font-family",
	"font-size",
	"font-style",
	"font-weight",
	"font-variant",
	"font-variant-caps",
	"text-align",
	"text-indent",
	"text-transform",
	"text-decoration",
	"text-decoration-line",
	"line-height",
	"letter-spacing",
	"word-spacing",
	"white-space",
	"color",
	"opacity",
	"direction",
	"writing-mode",
	"hyphens",
	"-epub-hyphens",
	"-webkit-hyphens",
	"orphans",
	"widows",
	"list-style-type",
	"list-style-position",
	"font-kerning",
	"font-feature-settings",
]);

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
	const classMap = extractClassMap(cssTexts);

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

	return { fonts, classMap, bodyFontFamily, direction, writingMode };
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

// --- CSS class map extraction ---

export function extractClassMap(cssTexts: string[]): ClassMap {
	const map: ClassMap = {};

	for (const css of cssTexts) {
		// Match .class-name { ... } rules (single class, no compound selectors)
		const ruleRegex = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)\s*\{([^}]+)\}/g;
		let match: RegExpExecArray | null;
		match = ruleRegex.exec(css);
		while (match !== null) {
			const className = match[1];
			const declarations = match[2];

			// Parse individual property: value pairs
			const propRegex = /([\w-]+)\s*:\s*([^;]+);/g;
			let propMatch: RegExpExecArray | null;
			propMatch = propRegex.exec(declarations);
			while (propMatch !== null) {
				const prop = propMatch[1].toLowerCase();
				const value = propMatch[2].trim();

				if (SAFE_PROPERTIES.has(prop)) {
					const key = `.${className}`;
					if (!map[key]) {
						map[key] = {};
					}
					map[key][prop] = value;
				}

				propMatch = propRegex.exec(declarations);
			}

			match = ruleRegex.exec(css);
		}
	}

	return map;
}
