import { createSignal, onCleanup } from "solid-js";
import type { ParsedBook, WorkerResponse } from "./types.ts";

export function useEpubParser() {
	const [parsing, setParsing] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	const [result, setResult] = createSignal<ParsedBook | null>(null);

	let worker: Worker | null = null;

	function parse(file: File): Promise<ParsedBook> {
		return new Promise((resolve, reject) => {
			setParsing(true);
			setError(null);
			setResult(null);

			worker = new Worker(
				new URL("../workers/epub.worker.ts", import.meta.url),
				{ type: "module" },
			);

			worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
				const { type } = event.data;

				if (type === "COMPLETE") {
					setResult(event.data.payload);
					setParsing(false);
					resolve(event.data.payload);
				} else if (type === "ERROR") {
					setError(event.data.error);
					setParsing(false);
					reject(new Error(event.data.error));
				}
			};

			worker.onerror = (event) => {
				setError(event.message);
				setParsing(false);
				reject(new Error(event.message));
			};

			worker.postMessage({ type: "PARSE", file });
		});
	}

	function abort() {
		worker?.postMessage({ type: "ABORT" });
		worker?.terminate();
		worker = null;
		setParsing(false);
	}

	onCleanup(() => {
		worker?.terminate();
	});

	return { parse, abort, parsing, error, result };
}
