import type { ParsedBook } from "anquar-core";

export type { ParsedBook };

export type WorkerMessage = { type: "PARSE"; file: File } | { type: "ABORT" };

export type WorkerResponse =
	| { type: "COMPLETE"; payload: ParsedBook }
	| { type: "ERROR"; error: string };
