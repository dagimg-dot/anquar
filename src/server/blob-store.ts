import { getStore } from "@netlify/blobs";
import type { ReminderRecord } from "../lib/reminder-schedule.ts";
import type { RemindersStore } from "./reminders.ts";

/** The reminders, one blob per phone, in the site's Netlify Blobs. */
export function blobStore(): RemindersStore {
	const blobs = getStore("reminders");
	return {
		get: async (key) =>
			(await blobs.get(key, { type: "json" })) as ReminderRecord | null,
		set: async (key, record) => void (await blobs.setJSON(key, record)),
		delete: async (key) => void (await blobs.delete(key)),
		keys: async () => (await blobs.list()).blobs.map((b) => b.key),
	};
}
