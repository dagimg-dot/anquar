import { describe, expect, it } from "vitest";
import { extractClassMap } from "./css-meta";

describe("extractClassMap", () => {
	it("extracts font-family from a class rule", () => {
		const css = [".bodytext { font-family: sans-serif; }"];
		const map = extractClassMap(css);
		expect(map[".bodytext"]).toEqual({ "font-family": "sans-serif" });
	});

	it("extracts multiple properties from a class rule", () => {
		const css = [".bodytext { font-family: sans-serif; text-indent: 1.3em; }"];
		const map = extractClassMap(css);
		expect(map[".bodytext"]).toEqual({
			"font-family": "sans-serif",
			"text-indent": "1.3em",
		});
	});

	it("extracts multiple class rules", () => {
		const css = [
			".bodytext { font-family: sans-serif; } .calibre2 { font-weight: bold; }",
		];
		const map = extractClassMap(css);
		expect(map[".bodytext"]).toEqual({ "font-family": "sans-serif" });
		expect(map[".calibre2"]).toEqual({ "font-weight": "bold" });
	});

	it("filters out layout properties", () => {
		const css = [".bad { position: absolute; display: none; width: 100px; }"];
		const map = extractClassMap(css);
		expect(map[".bad"]).toBeUndefined();
	});

	it("only keeps safe properties, ignores layout ones", () => {
		const css = [
			".mixed { font-family: serif; position: absolute; text-align: center; }",
		];
		const map = extractClassMap(css);
		expect(map[".mixed"]).toEqual({
			"font-family": "serif",
			"text-align": "center",
		});
	});

	it("handles multiple CSS files", () => {
		const css = [".a { font-family: A; }", ".b { font-family: B; }"];
		const map = extractClassMap(css);
		expect(map[".a"]).toEqual({ "font-family": "A" });
		expect(map[".b"]).toEqual({ "font-family": "B" });
	});

	it("handles vendor-prefixed properties", () => {
		const css = [".a { -epub-hyphens: none; }"];
		const map = extractClassMap(css);
		expect(map[".a"]).toEqual({ "-epub-hyphens": "none" });
	});

	it("returns empty map for empty CSS", () => {
		const map = extractClassMap([]);
		expect(map).toEqual({});
	});

	it("returns empty map for CSS with no class rules", () => {
		const map = extractClassMap(["body { font-family: serif; }"]);
		expect(map).toEqual({});
	});

	it("handles multiple declarations per rule across lines", () => {
		const css = [
			".para {\n  font-family: serif;\n  line-height: 1.5;\n  text-align: justify;\n}",
		];
		const map = extractClassMap(css);
		expect(map[".para"]).toEqual({
			"font-family": "serif",
			"line-height": "1.5",
			"text-align": "justify",
		});
	});
});
