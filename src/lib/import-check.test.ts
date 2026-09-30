import { describe, expect, it } from "vitest";
import { lockedByDrm, looksLikeZip, sameBook } from "./import-check.ts";

describe("looksLikeZip", () => {
	it("knows a zip by its first four bytes, not its name", () => {
		expect(looksLikeZip(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0]))).toBe(
			true,
		);
		expect(looksLikeZip(new TextEncoder().encode("%PDF-1.7"))).toBe(false);
		expect(looksLikeZip(new Uint8Array([0x50, 0x4b]))).toBe(false);
	});
});

describe("lockedByDrm", () => {
	const method = (algorithm: string) =>
		`<encryption><EncryptedData><EncryptionMethod Algorithm="${algorithm}"/></EncryptedData></encryption>`;

	it("lets obfuscated fonts through", () => {
		expect(
			lockedByDrm(method("http://www.idpf.org/2008/embedding"), false),
		).toBe(false);
		expect(lockedByDrm(method("http://ns.adobe.com/pdf/enc#RC"), false)).toBe(
			false,
		);
		expect(lockedByDrm("", false)).toBe(false);
	});

	it("stops encrypted text and Adobe rights files", () => {
		expect(
			lockedByDrm(method("http://www.w3.org/2001/04/xmlenc#aes128-cbc"), false),
		).toBe(true);
		expect(lockedByDrm("", true)).toBe(true);
	});
});

describe("sameBook", () => {
	it("matches title and author ignoring case and spacing", () => {
		expect(
			sameBook(
				{ title: "Animal  Farm", author: "George Orwell" },
				{ title: "animal farm", author: "george orwell " },
			),
		).toBe(true);
		expect(
			sameBook(
				{ title: "Animal Farm", author: "George Orwell" },
				{ title: "Animal Farm", author: "Someone Else" },
			),
		).toBe(false);
	});
});
