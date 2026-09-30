export type ImportFailure = "not-epub" | "drm" | "damaged" | "unreadable";

export const FAILURE_TEXT: Record<ImportFailure, string> = {
	"not-epub": "That file isn't an EPUB.",
	drm: "This book is locked with DRM, so Anquar can't open it.",
	damaged: "This EPUB is damaged and couldn't be read.",
	unreadable:
		"Your phone couldn't hand over that file. If it's in the cloud, download it first.",
};

// Every EPUB is a zip, and every zip starts "PK\x03\x04", whatever the file is called.
export function looksLikeZip(bytes: Uint8Array): boolean {
	return (
		bytes.length >= 4 &&
		bytes[0] === 0x50 &&
		bytes[1] === 0x4b &&
		bytes[2] === 0x03 &&
		bytes[3] === 0x04
	);
}

// Fonts are often obfuscated with these two algorithms, which any reader undoes; anything else encrypted,
// or an Adobe rights file, means the text itself is locked.
const FONT_OBFUSCATION = [
	"http://www.idpf.org/2008/embedding",
	"http://ns.adobe.com/pdf/enc#RC",
];

export function lockedByDrm(
	encryptionXml: string,
	hasRightsFile: boolean,
): boolean {
	if (hasRightsFile) return true;
	const algorithms = [
		...encryptionXml.matchAll(/EncryptionMethod[^>]*Algorithm="([^"]+)"/g),
	].map((m) => m[1]);
	return algorithms.some((a) => !FONT_OBFUSCATION.includes(a));
}
