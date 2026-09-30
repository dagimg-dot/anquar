import type { ImportFailure } from "./import-check.ts";
import type { ParsedBook, WorkerResponse } from "./types.ts";

export class ImportError extends Error {
	readonly reason: ImportFailure;

	constructor(reason: ImportFailure, detail = "") {
		super(detail || reason);
		this.reason = reason;
	}
}

// Parses one EPUB in its own worker, which is always shut down when the book is in or the import fails or
// is cancelled: a parsed book lives in that worker's memory until then.
export function parseEpub(
	file: File,
	options: { onReading?: () => void; signal?: AbortSignal } = {},
): Promise<ParsedBook> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(
			new URL("../workers/epub.worker.ts", import.meta.url),
			{ type: "module" },
		);
		const finish = () => {
			worker.terminate();
			options.signal?.removeEventListener("abort", onAbort);
		};
		const onAbort = () => {
			finish();
			reject(new DOMException("Import cancelled", "AbortError"));
		};
		if (options.signal?.aborted) return onAbort();
		options.signal?.addEventListener("abort", onAbort);

		worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
			const message = event.data;
			if (message.type === "READING") return options.onReading?.();
			finish();
			if (message.type === "COMPLETE") resolve(message.payload);
			else reject(new ImportError(message.reason, message.detail));
		};
		worker.onerror = (event) => {
			finish();
			reject(new ImportError("damaged", event.message));
		};
		worker.postMessage({ type: "PARSE", file });
	});
}
