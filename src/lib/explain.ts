import { GEMINI, geminiKey, geminiModel } from "./gemini.ts";

export type ExplainError =
	| "no-key"
	| "refused"
	| "no-model"
	| "busy"
	| "offline"
	| "failed";

export class ExplainFailure extends Error {
	readonly kind: ExplainError;

	constructor(kind: ExplainError) {
		super(kind);
		this.kind = kind;
	}
}

interface GeminiResponse {
	candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export interface ExplainAsk {
	book: { author: string; title: string };
	/** The text the words are read in: what was selected, or the card. */
	context: string;
	/** The words asked about, a phrase each; none asks about the whole context. */
	focus: string[];
}

const failureOf = (status: number): ExplainError =>
	status === 400 || status === 401 || status === 403
		? "refused"
		: status === 404
			? "no-model"
			: status === 429 || status === 503
				? "busy"
				: "failed";

// The answer comes as a short first line and, after a blank line, the rest, which the sheet sets as a gist
// and its detail.
const INSTRUCTION = [
	"You help someone reading a book on their phone understand what they just read.",
	"Answer in two parts: a short first line, then a blank line, then the rest.",
	"Plain language. No preamble, no labels, no markdown.",
].join(" ");

// Long enough for a slow first word, short enough that a request lost on the way doesn't leave the sheet waiting.
const TIMEOUT_MS = 20_000;

function promptOf({ book, context, focus }: ExplainAsk) {
	const source = `"${book.title}" by ${book.author}`;
	const words = new Intl.ListFormat("en", { type: "conjunction" }).format(
		focus.map((f) => `"${f}"`),
	);
	const ask = focus.length
		? [
				`What ${focus.length > 1 ? "do" : "does"} ${words} mean in this passage from ${source}?`,
				"First line: the meaning as the passage uses it, in a few words rather than a sentence.",
				"Then a blank line, then one or two sentences on how the passage uses it.",
			]
		: [
				`What does this passage from ${source} say?`,
				"First line: its point, in one short sentence.",
				"Then a blank line, then two or three sentences of context.",
			];
	return [...ask, "", context].join("\n");
}

/**
 * Sends the context and the words asked about, and nothing else, and hands
 * back the answer as it streams in. The key travels in a header rather than
 * the query string, which would put it in every proxy and server log on the way.
 */
export async function explain(
	ask: ExplainAsk,
	onText: (text: string) => void,
	signal?: AbortSignal,
): Promise<string> {
	const key = geminiKey();
	if (!key) throw new ExplainFailure("no-key");

	const lost = (error: unknown) => {
		if (signal?.aborted) return error;
		return new ExplainFailure(navigator.onLine ? "failed" : "offline");
	};

	let res: Response;
	try {
		res = await fetch(
			`${GEMINI}/models/${geminiModel()}:streamGenerateContent?alt=sse`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", "x-goog-api-key": key },
				body: JSON.stringify({
					system_instruction: { parts: [{ text: INSTRUCTION }] },
					contents: [{ parts: [{ text: promptOf(ask) }] }],
					generationConfig: { temperature: 0.3 },
				}),
				signal: AbortSignal.any(
					[signal, AbortSignal.timeout(TIMEOUT_MS)].filter(
						(s): s is AbortSignal => s !== undefined,
					),
				),
			},
		);
	} catch (error) {
		throw lost(error);
	}
	if (!res.ok || !res.body) throw new ExplainFailure(failureOf(res.status));

	// Server-sent events: each "data:" line is a JSON chunk carrying the next piece of the answer.
	const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
	let text = "";
	let pending = "";
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			pending += value;
			const lines = pending.split(/\r?\n/);
			pending = lines.pop() ?? "";
			for (const line of lines) {
				if (!line.startsWith("data:")) continue;
				let chunk: GeminiResponse;
				try {
					chunk = JSON.parse(line.slice(5));
				} catch {
					continue;
				}
				const piece = chunk.candidates?.[0]?.content?.parts
					?.map((p) => p.text ?? "")
					.join("");
				if (!piece) continue;
				text += piece;
				onText(text);
			}
		}
	} catch (error) {
		throw lost(error);
	}

	if (!text.trim()) throw new ExplainFailure("failed");
	return text;
}
