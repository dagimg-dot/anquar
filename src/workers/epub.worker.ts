import { parseEpubFromFile } from "anquar-core";
import JSZip from "jszip";
import type { WorkerMessage, WorkerResponse } from "../lib/types.ts";

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const { type } = event.data;
	if (type === "ABORT") {
		self.close();
		return;
	}

	try {
		const book = await parseEpubFromFile(event.data.file, JSZip);

		self.postMessage({
			type: "COMPLETE",
			payload: book satisfies import("anquar-core").ParsedBook,
		} satisfies WorkerResponse);
	} catch (err) {
		self.postMessage({
			type: "ERROR",
			error: err instanceof Error ? err.message : "Unknown error",
		} satisfies WorkerResponse);
	}
};
