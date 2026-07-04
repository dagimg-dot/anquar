import { IMG_BLOB_REGEX, uint8ArrayToDataUrl } from "./utils.ts";

export async function resolveImagesInHtml(html: string): Promise<string> {
	const imageCache = new Map<string, string>();
	const matches = html.matchAll(IMG_BLOB_REGEX);

	for (const match of matches) {
		const blobUrl = match[1];
		if (imageCache.has(blobUrl)) {
			continue;
		}

		try {
			const response = await fetch(blobUrl);
			const contentType = response.headers.get("content-type");
			if (!contentType?.startsWith("image/")) {
				continue;
			}

			const blob = await response.blob();
			const bytes = new Uint8Array(await blob.arrayBuffer());
			const dataUrl = uint8ArrayToDataUrl(bytes, contentType);
			imageCache.set(blobUrl, dataUrl);
		} catch {
			// Image fetch failed
		}
	}

	let resolved = html;
	for (const [blobUrl, dataUrl] of imageCache) {
		resolved = resolved.replaceAll(blobUrl, dataUrl);
	}

	return resolved;
}
