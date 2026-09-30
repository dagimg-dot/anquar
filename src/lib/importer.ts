import { findBook, saveBook } from "./db.ts";
import { parseEpub } from "./epub.ts";

export type ImportStage = "opening" | "reading" | "saving";

export interface Imported {
	bookId: string;
	title: string;
	alreadyThere: boolean;
}

// A book already in the library opens instead of arriving twice.
export async function importBook(
	file: File,
	options: {
		onStage?: (stage: ImportStage) => void;
		signal?: AbortSignal;
	} = {},
): Promise<Imported> {
	options.onStage?.("opening");
	const book = await parseEpub(file, {
		onReading: () => options.onStage?.("reading"),
		signal: options.signal,
	});
	const existing = await findBook(book);
	if (existing)
		return { bookId: existing.id, title: existing.title, alreadyThere: true };
	options.onStage?.("saving");
	return {
		bookId: await saveBook(book),
		title: book.title,
		alreadyThere: false,
	};
}
