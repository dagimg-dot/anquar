import { describe, expect, it } from "vitest";
import type { ReminderRecord } from "../lib/reminder-schedule.ts";
import { handleReminder, type RemindersStore, sendDue } from "./reminders.ts";

function memoryStore(): RemindersStore & { rows: Map<string, ReminderRecord> } {
	const rows = new Map<string, ReminderRecord>();
	return {
		rows,
		get: async (k) => rows.get(k) ?? null,
		set: async (k, v) => void rows.set(k, v),
		delete: async (k) => void rows.delete(k),
		keys: async () => [...rows.keys()],
	};
}

const endpoint = "https://fcm.googleapis.com/fcm/send/abc";
const body = {
	subscription: {
		endpoint,
		keys: { p256dh: "p", auth: "a" },
		expirationTime: null,
	},
	time: "20:00",
	tz: "Africa/Addis_Ababa",
};
const call = (method: string, payload: unknown, store: RemindersStore) =>
	handleReminder(
		new Request("https://x.test/api/reminder", {
			method,
			body:
				method === "GET"
					? undefined
					: typeof payload === "string"
						? payload
						: JSON.stringify(payload),
		}),
		store,
	);

describe("handleReminder", () => {
	it("keeps a phone's reminder and nothing beyond what it needs", async () => {
		const store = memoryStore();
		expect(
			(
				await call(
					"PUT",
					{ ...body, closedDay: "2026-10-04", books: ["Dune"] },
					store,
				)
			).status,
		).toBe(204);
		const [row] = [...store.rows.values()];
		expect(row).toEqual({
			subscription: { endpoint, keys: { p256dh: "p", auth: "a" } },
			time: "20:00",
			tz: "Africa/Addis_Ababa",
			closedDay: "2026-10-04",
			sentDay: undefined,
		});
	});

	it("updates in place, keeping the day already reminded", async () => {
		const store = memoryStore();
		await call("PUT", body, store);
		const [key] = [...store.rows.keys()];
		const row = store.rows.get(key);
		if (row) store.rows.set(key, { ...row, sentDay: "2026-10-04" });
		await call("PUT", { ...body, time: "21:00" }, store);
		expect(store.rows.size).toBe(1);
		expect(store.rows.get(key)).toMatchObject({
			time: "21:00",
			sentDay: "2026-10-04",
		});
	});

	it("clears a closed day when the phone stops sending it", async () => {
		const store = memoryStore();
		await call("PUT", { ...body, closedDay: "2026-10-04" }, store);
		await call("PUT", body, store);
		expect([...store.rows.values()][0].closedDay).toBeUndefined();
	});

	it("drops a reminder on DELETE", async () => {
		const store = memoryStore();
		await call("PUT", body, store);
		expect((await call("DELETE", { endpoint }, store)).status).toBe(204);
		expect(store.rows.size).toBe(0);
	});

	it("refuses what it can't use", async () => {
		const store = memoryStore();
		const bad = (over: object) =>
			call("PUT", { ...body, ...over }, store).then((r) => r.status);
		expect(await bad({ time: "8pm" })).toBe(400);
		expect(await bad({ tz: "Nowhere/Land" })).toBe(400);
		expect(await bad({ closedDay: "today" })).toBe(400);
		expect(
			await bad({
				subscription: {
					...body.subscription,
					endpoint: "https://evil.example/x",
				},
			}),
		).toBe(400);
		expect(await bad({ subscription: { endpoint, keys: {} } })).toBe(400);
		expect((await call("PUT", "not json", store)).status).toBe(400);
		expect((await call("PUT", "x".repeat(5000), store)).status).toBe(413);
		expect((await call("GET", "", store)).status).toBe(405);
		expect(store.rows.size).toBe(0);
	});
});

describe("sendDue", () => {
	const due = new Date("2026-10-04T17:10:00Z"); // 20:10 in Addis Ababa
	const record = (over: Partial<ReminderRecord> = {}): ReminderRecord => ({
		subscription: { endpoint, keys: { p256dh: "p", auth: "a" } },
		time: "20:00",
		tz: "Africa/Addis_Ababa",
		...over,
	});

	it("sends what is due once, with a line that names no book", async () => {
		const store = memoryStore();
		store.rows.set("a", record());
		const sent: string[] = [];
		const send = async (_: unknown, payload: string) => void sent.push(payload);
		expect(await sendDue(store, send, due)).toEqual({
			sent: 1,
			dropped: 0,
			failed: 0,
		});
		expect(JSON.parse(sent[0])).toMatchObject({ title: "anquar" });
		expect(store.rows.get("a")?.sentDay).toBe("2026-10-04");
		expect((await sendDue(store, send, due)).sent).toBe(0);
		expect(sent).toHaveLength(1);
	});

	it("leaves a closed day, and a time not yet come, alone", async () => {
		const store = memoryStore();
		store.rows.set("closed", record({ closedDay: "2026-10-04" }));
		store.rows.set("later", record({ time: "22:00" }));
		const send = async () => {
			throw new Error("nothing should be sent");
		};
		expect(await sendDue(store, send, due)).toEqual({
			sent: 0,
			dropped: 0,
			failed: 0,
		});
	});

	it("drops a phone whose push address is gone, and keeps one that merely failed", async () => {
		const store = memoryStore();
		const on = (path: string) =>
			record({
				subscription: {
					endpoint: `https://fcm.googleapis.com/fcm/send/${path}`,
					keys: { p256dh: "p", auth: "a" },
				},
			});
		store.rows.set("gone", on("gone"));
		store.rows.set("flaky", on("flaky"));
		const send = async (sub: ReminderRecord["subscription"]) => {
			throw Object.assign(new Error("push service said no"), {
				statusCode: sub.endpoint.endsWith("gone") ? 410 : 500,
			});
		};
		expect(await sendDue(store, send, due)).toEqual({
			sent: 0,
			dropped: 1,
			failed: 1,
		});
		expect([...store.rows.keys()]).toEqual(["flaky"]);
		expect(store.rows.get("flaky")?.sentDay).toBeUndefined();
	});
});
