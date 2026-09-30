import { EpubZip, type ParsedBook, parseEpubFromZip } from "anquar-core";
import JSZip from "jszip";
import {
	type ImportFailure,
	lockedByDrm,
	looksLikeZip,
} from "../lib/import-check.ts";
import type { WorkerMessage, WorkerResponse } from "../lib/types.ts";

const post = (message: WorkerResponse, transfer: Transferable[] = []) =>
	self.postMessage(message, { transfer });
const fail = (reason: ImportFailure, detail = "") =>
	post({ type: "FAILED", reason, detail });

// The image bytes move to the page rather than being copied: a big book's images are most of its size.
function buffersOf(book: ParsedBook): ArrayBuffer[] {
	const buffers = new Set<ArrayBuffer>();
	if (book.coverImage) buffers.add(book.coverImage.buffer as ArrayBuffer);
	for (const chapter of book.chapters)
		for (const block of chapter.blocks)
			if (block.type === "image" && block.data)
				buffers.add(block.data.buffer as ArrayBuffer);
	return [...buffers];
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const { file } = event.data;

	let bytes: Uint8Array;
	try {
		bytes = new Uint8Array(await file.arrayBuffer());
	} catch (err) {
		return fail("unreadable", String(err));
	}
	if (!looksLikeZip(bytes)) return fail("not-epub");

	let zip: EpubZip;
	try {
		zip = await EpubZip.fromJSZip(await JSZip.loadAsync(bytes));
	} catch (err) {
		return fail("damaged", String(err));
	}
	if (
		lockedByDrm(
			zip.readText("META-INF/encryption.xml"),
			zip.has("META-INF/rights.xml"),
		)
	)
		return fail("drm");

	post({ type: "READING" });
	try {
		const book = await parseEpubFromZip(zip, undefined, file.name);
		post({ type: "COMPLETE", payload: book }, buffersOf(book));
	} catch (err) {
		fail("damaged", err instanceof Error ? err.message : String(err));
	}
};
