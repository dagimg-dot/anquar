import type { Config } from "@netlify/functions";
import webpush from "web-push";
import {
	VAPID_PUBLIC_KEY,
	VAPID_SUBJECT,
} from "../../src/lib/reminder-schedule.ts";
import { blobStore } from "../../src/server/blob-store.ts";
import { sendDue } from "../../src/server/reminders.ts";

// A reminder is stale an hour after its time, so the push service may drop it then.
const TTL_SECONDS = 3600;

export default async () => {
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	if (!privateKey) {
		console.error("VAPID_PRIVATE_KEY is not set");
		return;
	}
	webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
	const result = await sendDue(
		blobStore(),
		async (subscription, payload) => {
			await webpush.sendNotification(subscription, payload, {
				TTL: TTL_SECONDS,
			});
		},
		new Date(),
	);
	console.log("reminders", result);
};

export const config: Config = { schedule: "*/15 * * * *" };
