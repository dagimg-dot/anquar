import type { ParsedBook } from "anquar-core";
import type { ImportFailure } from "./import-check.ts";

export type { ParsedBook };

export type WorkerMessage = { type: "PARSE"; file: File };

export type WorkerResponse =
	| { type: "READING" }
	| { type: "COMPLETE"; payload: ParsedBook }
	| {
			type: "FAILED";
			reason: ImportFailure;
			detail: string;
	  };
