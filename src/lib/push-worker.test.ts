import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

// public/push.js is a plain service worker script, so it runs here against a stand-in for the worker's globals.
function worker(
	windows: { visibilityState: string; focus: () => Promise<void> }[],
) {
	const listeners: Record<string, (event: unknown) => void> = {};
	const shown: [string, NotificationOptions][] = [];
	const opened: string[] = [];
	const self = {
		addEventListener: (type: string, fn: (event: unknown) => void) => {
			listeners[type] = fn;
		},
		clients: {
			matchAll: async () => windows,
			openWindow: async (url: string) => void opened.push(url),
		},
		registration: {
			showNotification: async (title: string, options: NotificationOptions) =>
				void shown.push([title, options]),
		},
	};
	runInNewContext(readFileSync("public/push.js", "utf8"), { self });
	const pending: Promise<unknown>[] = [];
	const fire = async (type: string, event: object) => {
		listeners[type]({
			...event,
			waitUntil: (p: Promise<unknown>) => pending.push(p),
		});
		await Promise.all(pending);
	};
	return { fire, shown, opened };
}

const payload = (data: object) => ({ data: { json: () => data } });

describe("the service worker's reminder", () => {
	it("shows what the server sent, tagged so one reminder replaces another", async () => {
		const w = worker([]);
		await w.fire(
			"push",
			payload({ title: "anquar", body: "Your book is where you left it." }),
		);
		expect(w.shown).toHaveLength(1);
		expect(w.shown[0][0]).toBe("anquar");
		expect(w.shown[0][1]).toMatchObject({
			body: "Your book is where you left it.",
			tag: "anquar-reminder",
		});
	});

	it("still shows something when the push has no readable words", async () => {
		const w = worker([]);
		await w.fire("push", {
			data: {
				json: () => {
					throw new Error("not json");
				},
			},
		});
		expect(w.shown[0][0]).toBe("anquar");
	});

	it("stays out of the way when the app is open in front of you", async () => {
		const w = worker([{ visibilityState: "visible", focus: async () => {} }]);
		await w.fire("push", payload({ title: "anquar", body: "x" }));
		expect(w.shown).toHaveLength(0);
	});

	it("opens the book read last when tapped with the app closed", async () => {
		const w = worker([]);
		let closed = false;
		await w.fire("notificationclick", {
			notification: {
				close: () => {
					closed = true;
				},
			},
		});
		expect(closed).toBe(true);
		expect(w.opened).toEqual(["/app/?continue"]);
	});

	it("brings the app forward when it's open behind another", async () => {
		let focused = false;
		const w = worker([
			{
				visibilityState: "hidden",
				focus: async () => {
					focused = true;
				},
			},
		]);
		await w.fire("notificationclick", { notification: { close: () => {} } });
		expect(focused).toBe(true);
		expect(w.opened).toEqual([]);
	});
});
