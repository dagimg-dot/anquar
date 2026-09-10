const urls = new Map<string, string>();

/** Cached: a fresh object URL per render would reload the image and flicker. */
export function coverUrl(
	bookId: string,
	cover: Blob | undefined,
): string | undefined {
	if (!cover) return undefined;

	const cached = urls.get(bookId);
	if (cached) return cached;

	const url = URL.createObjectURL(cover);
	urls.set(bookId, url);
	return url;
}

export function releaseCoverUrl(bookId: string): void {
	const url = urls.get(bookId);
	if (!url) return;
	URL.revokeObjectURL(url);
	urls.delete(bookId);
}
