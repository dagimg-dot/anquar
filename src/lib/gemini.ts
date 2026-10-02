export const GEMINI = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

const KEY = "anquar_api_key";
const MODEL = "anquar_model";

export const geminiKey = () => localStorage.getItem(KEY)?.trim() ?? "";
export const setGeminiKey = (key: string) =>
	localStorage.setItem(KEY, key.trim());

// A model kept from before Explain spoke only to Gemini (gpt-4o and the like) reads as the default.
export function geminiModel() {
	const model = localStorage.getItem(MODEL) ?? "";
	return model.startsWith("gemini") ? model : DEFAULT_MODEL;
}
export const setGeminiModel = (model: string) =>
	localStorage.setItem(MODEL, model);

export interface GeminiModel {
	id: string;
	name: string;
}

export type ConnectError = "refused" | "offline" | "failed";

export class ConnectFailure extends Error {
	readonly kind: ConnectError;

	constructor(kind: ConnectError) {
		super(kind);
		this.kind = kind;
	}
}

export const CONNECT_MESSAGES: Record<ConnectError, string> = {
	refused: "Google turned that key down. Check it and try again.",
	offline: "You're offline. Connect to check the key.",
	failed: "Couldn't reach Google. Try again.",
};

interface ModelList {
	models?: {
		displayName?: string;
		name: string;
		supportedGenerationMethods?: string[];
	}[];
}

// Gemini models that write text: the ones for speech, pictures, live audio, embeddings and the like
// generate too, but not an answer.
const NOT_TEXT =
	/tts|image|audio|live|embedding|robotics|computer-use|veo|imagen/;

/**
 * The models this key can use, which is also how a key is checked: Google
 * lists them only for a key it accepts. Flash models come first, being the
 * quick ones, which is what Explain wants.
 */
export async function listModels(
	key: string,
	signal?: AbortSignal,
): Promise<GeminiModel[]> {
	let res: Response;
	try {
		res = await fetch(`${GEMINI}/models?pageSize=1000`, {
			headers: { "x-goog-api-key": key.trim() },
			signal: signal ?? AbortSignal.timeout(10_000),
		});
	} catch {
		throw new ConnectFailure(navigator.onLine ? "failed" : "offline");
	}
	if (res.status === 400 || res.status === 401 || res.status === 403)
		throw new ConnectFailure("refused");
	if (!res.ok) throw new ConnectFailure("failed");

	const { models = [] } = (await res.json()) as ModelList;
	return models
		.filter(
			(m) =>
				m.supportedGenerationMethods?.includes("generateContent") &&
				m.name.startsWith("models/gemini") &&
				!NOT_TEXT.test(m.name),
		)
		.map((m) => {
			const id = m.name.replace("models/", "");
			return { id, name: m.displayName || id };
		})
		.sort(
			(a, b) =>
				Number(b.id.includes("flash")) - Number(a.id.includes("flash")) ||
				a.name.localeCompare(b.name),
		);
}

// The model you chose while the key still offers it; otherwise the quickest kind there is.
export function pickModel(models: GeminiModel[], wanted: string) {
	const has = (test: (id: string) => boolean) =>
		models.find((m) => test(m.id))?.id;
	return (
		has((id) => id === wanted) ??
		has((id) => id === DEFAULT_MODEL) ??
		has((id) => id.includes("flash-lite")) ??
		has((id) => id.includes("flash")) ??
		models[0]?.id ??
		wanted
	);
}

// Checks a key, and keeps it with the model it will use when Google accepts it.
export async function connect(key: string) {
	const models = await listModels(key);
	setGeminiKey(key);
	setGeminiModel(pickModel(models, geminiModel()));
	return models;
}
