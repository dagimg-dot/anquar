import { createSignal } from "solid-js";
import { dayKey } from "./reading.ts";
import {
	type PushSubscriptionJson,
	REMINDER_PATH,
	VAPID_PUBLIC_KEY,
} from "./reminder-schedule.ts";

// The daily reminder. A phone that turns it on subscribes to push and tells the server (src/server/reminders.ts)
// the time it chose, its time zone and whether today's goal is closed, which is how a day already read stays
// quiet. What was read never goes with it. The words of the reminder come from the server; showing them, and what a
// tap does, is public/push.js.

const TIME_KEY = "anquar_reminder";
const SYNC_KEY = "anquar_reminder_sync";
export const DEFAULT_TIME = "20:00";

function read(key: string): string | undefined {
	try {
		return localStorage.getItem(key) ?? undefined;
	} catch {
		return undefined;
	}
}

function write(key: string, value: string | undefined) {
	try {
		if (value === undefined) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	} catch {}
}

const [time, setTime] = createSignal(read(TIME_KEY));

/** The time of day (HH:MM) the reminder comes, or nothing while it's off. */
export const reminderTime = time;

export type Support = "ok" | "install" | "no";

const iPhone = () =>
	/iPad|iPhone|iPod/.test(navigator.userAgent) ||
	(navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const installed = () =>
	matchMedia("(display-mode: standalone)").matches ||
	(navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Whether this browser can be reminded; an iPhone can only once anquar is on its Home Screen. */
export function support(): Support {
	if (iPhone() && !installed()) return "install";
	return "serviceWorker" in navigator &&
		"PushManager" in window &&
		"Notification" in window
		? "ok"
		: "no";
}

export const blocked = () =>
	"Notification" in window && Notification.permission === "denied";

export type Outcome = "ok" | "blocked" | "unsupported" | "failed";

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
	const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
	return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// There is no worker under the dev server, so nothing there can be reminded.
async function registration(): Promise<ServiceWorkerRegistration | undefined> {
	if (!("serviceWorker" in navigator)) return undefined;
	if (!(await navigator.serviceWorker.getRegistration())) return undefined;
	return navigator.serviceWorker.ready;
}

async function request(method: "PUT" | "DELETE", body: unknown) {
	const res = await fetch(REMINDER_PATH, {
		method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	return res.ok;
}

async function put(
	subscription: PushSubscription,
	at: string,
	closed: boolean,
): Promise<boolean> {
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const closedDay = closed ? dayKey() : undefined;
	const body = {
		subscription: subscription.toJSON() as PushSubscriptionJson,
		time: at,
		tz,
		closedDay,
	};
	try {
		if (!(await request("PUT", body))) return false;
	} catch {
		return false;
	}
	write(SYNC_KEY, JSON.stringify([at, tz, closedDay]));
	return true;
}

/** Turns the reminder on, asking for notifications if they haven't been allowed. Call it from a tap. */
export async function turnOnReminder(
	at: string,
	closed: boolean,
): Promise<Outcome> {
	if (support() !== "ok") return "unsupported";
	const allowed =
		Notification.permission === "default"
			? await Notification.requestPermission()
			: Notification.permission;
	if (allowed !== "granted") return "blocked";
	try {
		const reg = await registration();
		if (!reg) return "unsupported";
		const existing = await reg.pushManager.getSubscription();
		const subscription =
			existing ??
			(await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
			}));
		if (!(await put(subscription, at, closed))) {
			if (!existing) await subscription.unsubscribe();
			return "failed";
		}
	} catch {
		return "failed";
	}
	write(TIME_KEY, at);
	setTime(at);
	return "ok";
}

/** Moves the reminder to another time of day. */
export async function moveReminder(
	at: string,
	closed: boolean,
): Promise<Outcome> {
	try {
		const subscription = await (
			await registration()
		)?.pushManager.getSubscription();
		if (!subscription) return turnOnReminder(at, closed);
		if (!(await put(subscription, at, closed))) return "failed";
	} catch {
		return "failed";
	}
	write(TIME_KEY, at);
	setTime(at);
	return "ok";
}

/** Turns it off. Dropping the subscription is what stops it; telling the server just tidies up. */
export async function turnOffReminder() {
	write(TIME_KEY, undefined);
	write(SYNC_KEY, undefined);
	setTime(undefined);
	try {
		const subscription = await (
			await registration()
		)?.pushManager.getSubscription();
		if (!subscription) return;
		await request("DELETE", { endpoint: subscription.endpoint }).catch(
			() => {},
		);
		await subscription.unsubscribe();
	} catch {}
}

let syncing: Promise<void> | undefined;

/**
 * Keeps the server's view of today current: whether the goal is closed, and the phone's time zone. It only
 * sends when that has changed, so it can be called whenever the Pulse is worked out.
 */
export function syncReminder(closed: boolean): Promise<void> {
	const at = time();
	if (
		!at ||
		!("Notification" in window) ||
		Notification.permission !== "granted"
	)
		return Promise.resolve();
	const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const closedDay = closed ? dayKey() : undefined;
	if (read(SYNC_KEY) === JSON.stringify([at, tz, closedDay]))
		return Promise.resolve();
	syncing = (syncing ?? Promise.resolve()).then(async () => {
		try {
			const reg = await registration();
			const subscription =
				(await reg?.pushManager.getSubscription()) ??
				(await reg?.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
				}));
			if (subscription) await put(subscription, at, closed);
		} catch {}
	});
	return syncing;
}
