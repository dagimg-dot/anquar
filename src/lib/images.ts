import { getImageBlob } from "./db.ts";

const urls = new Map<string, string>();

/** Undefined when the EPUB referenced an image its archive lacks — common, not an error. */
export async function imageUrl(imageId: string): Promise<string | undefined> {
	const cached = urls.get(imageId);
	if (cached) return cached;

	const blob = await getImageBlob(imageId);
	if (!blob) return undefined;

	const url = URL.createObjectURL(blob);
	urls.set(imageId, url);
	return url;
}
