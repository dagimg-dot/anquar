/** Many EPUBs ship blank chapter titles; the spine position is the fallback. */
export function chapterLabel(title: string, index: number): string {
	return title.trim() || `Chapter ${index + 1}`;
}
