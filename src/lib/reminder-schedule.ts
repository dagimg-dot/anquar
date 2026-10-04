import { DAY_ENDS_AT } from "./reading.ts";

// What decides when the daily reminder goes out. The app and the function that sends it
// (netlify/functions) both read this, so the time a phone asks for and the time the server keeps mean the same.

// The public half of the key pair the reminders are signed with; the private half is VAPID_PRIVATE_KEY on Netlify.
export const VAPID_PUBLIC_KEY =
	"BCOmQPBOsY_0gI4jDzTWPmy65yR_kKkS7EMnRYa4t5dAjY0p83G5GoaQbeoMuTJ3cP0MayzqZk44pRcMm-imcZY";
export const VAPID_SUBJECT = "https://anquar.netlify.app";
export const REMINDER_PATH = "/api/reminder";

// The server looks every 15 minutes, so a reminder is sent in the hour and a half after its time. Later than
// that it's stale, and "tonight" at 3 a.m. is worse than nothing.
export const SEND_WINDOW_MIN = 90;

export interface PushSubscriptionJson {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

export interface ReminderRecord {
	subscription: PushSubscriptionJson;
	/** HH:MM on the phone's clock */
	time: string;
	/** IANA name, so the server can tell what time it is where the phone is */
	tz: string;
	/** The reading day whose goal is closed, when it is: a closed day is left alone. */
	closedDay?: string;
	/** The reading day last reminded, so a day is reminded once. */
	sentDay?: string;
}

// Only the push services browsers use, so the server is never asked to send to some other address.
const PUSH_HOSTS = [
	/(^|\.)fcm\.googleapis\.com$/,
	/(^|\.)push\.services\.mozilla\.com$/,
	/(^|\.)push\.apple\.com$/,
	/(^|\.)notify\.windows\.com$/,
];

export function isPushEndpoint(endpoint: unknown): endpoint is string {
	if (typeof endpoint !== "string" || endpoint.length > 1024) return false;
	try {
		const url = new URL(endpoint);
		return (
			url.protocol === "https:" &&
			PUSH_HOSTS.some((host) => host.test(url.hostname))
		);
	} catch {
		return false;
	}
}

export function minutesOf(time: unknown): number | undefined {
	if (typeof time !== "string") return undefined;
	const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
	return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
}

export function isTimeZone(tz: unknown): tz is string {
	if (typeof tz !== "string" || tz.length > 64) return false;
	try {
		new Intl.DateTimeFormat("en", { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

export function isDay(day: unknown): day is string {
	return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day);
}

function clockIn(at: Date, tz: string) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(at);
	const part = (type: string) =>
		parts.find((p) => p.type === type)?.value ?? "";
	return {
		day: `${part("year")}-${part("month")}-${part("day")}`,
		minutes: Number(part("hour")) * 60 + Number(part("minute")),
	};
}

/** The reading day at a moment in a time zone: what dayKey says on a phone there. */
export function readingDayIn(at: Date, tz: string): string {
	return clockIn(new Date(at.getTime() - DAY_ENDS_AT * 3_600_000), tz).day;
}

/**
 * The reading day this reminder is due for now, or nothing. It's due in the window after its time, once a
 * day, and not at all on a day whose goal is closed.
 */
export function dueDay(r: ReminderRecord, now: Date): string | undefined {
	const at = minutesOf(r.time);
	if (at === undefined) return undefined;
	const since = (clockIn(now, r.tz).minutes - at + 1440) % 1440;
	if (since >= SEND_WINDOW_MIN) return undefined;
	const day = readingDayIn(new Date(now.getTime() - since * 60_000), r.tz);
	return r.sentDay === day || r.closedDay === day ? undefined : day;
}

const LINES = [
	"Your book is where you left it.",
	"A few cards before the day ends?",
	"Today's anquar is still open.",
	"Five minutes is plenty. Pick up where you left off.",
	"Trade one scroll for one card.",
	"The next page is one tap away.",
];

/** What a reminder says. It changes by the day and never mentions what you read. */
export function reminderLine(day: string): { title: string; body: string } {
	let hash = 0;
	for (const c of day) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
	return { title: "anquar", body: LINES[hash % LINES.length] };
}
