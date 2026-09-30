const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export type ExplainError = "no-key" | "unsupported-model" | "failed";

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

/**
 * Sends one passage and nothing else. The key travels in a header rather than
 * the query string, which would put it in every proxy and server log on the way.
 */
export async function explainPassage(
	passage: string,
	book: { author: string; title: string },
	signal?: AbortSignal,
): Promise<string> {
	const key = localStorage.getItem("anquar_api_key") ?? "";
	const model = localStorage.getItem("anquar_model") ?? "gemini-2.0-flash";

	if (!key) throw new ExplainFailure("no-key");
	if (!model.startsWith("gemini"))
		throw new ExplainFailure("unsupported-model");

	const prompt = [
		`Explain this passage from "${book.title}" by ${book.author}.`,
		"Plain language, three sentences at most. No preamble.",
		"",
		passage,
	].join("\n");

	let res: Response;
	try {
		res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-goog-api-key": key },
			body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
			signal,
		});
	} catch {
		throw new ExplainFailure("failed");
	}

	if (!res.ok) throw new ExplainFailure("failed");

	const data = (await res.json()) as GeminiResponse;
	const text = data.candidates?.[0]?.content?.parts
		?.map((p) => p.text ?? "")
		.join("")
		.trim();

	if (!text) throw new ExplainFailure("failed");
	return text;
}
