import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ConnectFailure,
	connect,
	geminiModel,
	listModels,
	pickModel,
} from "./gemini";

const listing = {
	models: [
		{
			name: "models/gemini-3.5-pro",
			displayName: "Gemini 3.5 Pro",
			supportedGenerationMethods: ["generateContent"],
		},
		{
			name: "models/gemini-3.5-flash-lite",
			displayName: "Gemini 3.5 Flash-Lite",
			supportedGenerationMethods: ["generateContent"],
		},
		{
			name: "models/gemini-3.5-flash",
			displayName: "Gemini 3.5 Flash",
			supportedGenerationMethods: ["generateContent"],
		},
		{
			name: "models/gemini-2.5-flash-preview-tts",
			displayName: "TTS",
			supportedGenerationMethods: ["generateContent"],
		},
		{
			name: "models/gemini-2.5-flash-image",
			displayName: "Image",
			supportedGenerationMethods: ["generateContent"],
		},
		{
			name: "models/gemini-embedding-001",
			supportedGenerationMethods: ["embedContent"],
		},
		{
			name: "models/gemma-3-27b-it",
			displayName: "Gemma",
			supportedGenerationMethods: ["generateContent"],
		},
	],
};

const respond = (status: number, body: unknown = {}) =>
	vi
		.spyOn(globalThis, "fetch")
		.mockResolvedValue(new Response(JSON.stringify(body), { status }));

// The test environment's own localStorage doesn't store anything.
beforeEach(() => {
	const store = new Map<string, string>();
	vi.stubGlobal("localStorage", {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => store.set(k, v),
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("listModels", () => {
	it("keeps Gemini's text models, flash first, and sends the key in a header", async () => {
		const fetch = respond(200, listing);
		const models = await listModels("k");
		expect(models.map((m) => m.id)).toEqual([
			"gemini-3.5-flash",
			"gemini-3.5-flash-lite",
			"gemini-3.5-pro",
		]);
		const [url, init] = fetch.mock.calls[0];
		expect(String(url)).not.toContain("key=");
		expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe(
			"k",
		);
	});

	it("reads a key Google refuses as refused", async () => {
		respond(400, { error: { message: "API key not valid" } });
		await expect(listModels("bad")).rejects.toMatchObject({ kind: "refused" });
	});
});

describe("pickModel", () => {
	const models = [
		{ id: "gemini-3.5-flash", name: "" },
		{ id: "gemini-3.5-flash-lite", name: "" },
		{ id: "gemini-3.5-pro", name: "" },
	];

	it("keeps the model you chose while the key offers it", () => {
		expect(pickModel(models, "gemini-3.5-pro")).toBe("gemini-3.5-pro");
	});

	it("moves a retired model to the quickest there is", () => {
		expect(pickModel(models, "gemini-2.0-flash")).toBe("gemini-3.5-flash-lite");
		expect(pickModel([models[0], models[2]], "gemini-2.0-flash")).toBe(
			"gemini-3.5-flash",
		);
	});
});

describe("connect", () => {
	it("keeps the key and a model it offers only once Google accepts it", async () => {
		localStorage.setItem("anquar_model", "gemini-2.0-flash");
		respond(200, listing);
		await connect(" good ");
		expect(localStorage.getItem("anquar_api_key")).toBe("good");
		expect(geminiModel()).toBe("gemini-3.5-flash-lite");
	});

	it("keeps nothing for a refused key", async () => {
		respond(403);
		await expect(connect("bad")).rejects.toBeInstanceOf(ConnectFailure);
		expect(localStorage.getItem("anquar_api_key")).toBeNull();
	});

	it("reads a model from before Gemini-only as the default", () => {
		localStorage.setItem("anquar_model", "gpt-4o");
		expect(geminiModel()).toBe("gemini-3.5-flash-lite");
	});
});
