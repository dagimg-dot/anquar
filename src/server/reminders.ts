import {
	dueDay,
	isDay,
	isPushEndpoint,
	isTimeZone,
	minutesOf,
	type ReminderRecord,
	reminderLine,
} from "../lib/reminder-schedule.ts";

// The server side of the daily reminder: the phones' requests to be reminded (or not), and the sweep that
// sends what is due. It holds each phone's push address, the time and time zone it chose and whether today's
// goal is closed, and nothing about what was read. netlify/functions wires these to Netlify.

export interface RemindersStore {
	get(key: string): Promise<ReminderRecord | null>;
	set(key: string, record: ReminderRecord): Promise<void>;
	delete(key: string): Promise<void>;
	keys(): Promise<string[]>;
}

export type Send = (
	subscription: ReminderRecord["subscription"],
	payload: string,
) => Promise<void>;

const MAX_BODY = 4096;

async function keyOf(endpoint: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(endpoint),
	);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

const reply = (status: number, error?: string) =>
	error ? Response.json({ error }, { status }) : new Response(null, { status });

/** PUT keeps a phone's reminder (a repeat updates it), DELETE drops it. */
export async function handleReminder(
	req: Request,
	store: RemindersStore,
): Promise<Response> {
	if (req.method !== "PUT" && req.method !== "DELETE")
		return reply(405, "Use PUT or DELETE");

	const text = await req.text();
	if (text.length > MAX_BODY) return reply(413, "Too large");
	let body: Record<string, unknown>;
	try {
		body = JSON.parse(text);
	} catch {
		return reply(400, "Not JSON");
	}
	if (typeof body !== "object" || body === null) return reply(400, "Not JSON");

	if (req.method === "DELETE") {
		if (!isPushEndpoint(body.endpoint)) return reply(400, "No such endpoint");
		await store.delete(await keyOf(body.endpoint));
		return reply(204);
	}

	const sub = body.subscription as
		| { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
		| undefined;
	const keys = sub?.keys;
	if (
		!sub ||
		!isPushEndpoint(sub.endpoint) ||
		typeof keys?.p256dh !== "string" ||
		typeof keys.auth !== "string" ||
		keys.p256dh.length > 256 ||
		keys.auth.length > 64
	)
		return reply(400, "Bad subscription");
	if (minutesOf(body.time) === undefined) return reply(400, "Bad time");
	if (!isTimeZone(body.tz)) return reply(400, "Bad time zone");
	if (body.closedDay !== undefined && !isDay(body.closedDay))
		return reply(400, "Bad day");

	const key = await keyOf(sub.endpoint);
	const before = await store.get(key);
	await store.set(key, {
		subscription: {
			endpoint: sub.endpoint,
			keys: { p256dh: keys.p256dh, auth: keys.auth },
		},
		time: body.time as string,
		tz: body.tz,
		closedDay: body.closedDay as string | undefined,
		sentDay: before?.sentDay,
	});
	return reply(204);
}

const BATCH = 25;

/** Sends every reminder that is due and notes the day, dropping a phone whose push address has expired. */
export async function sendDue(
	store: RemindersStore,
	send: Send,
	now: Date,
): Promise<{ sent: number; dropped: number; failed: number }> {
	const result = { sent: 0, dropped: 0, failed: 0 };
	const keys = await store.keys();

	async function remind(key: string) {
		const record = await store.get(key);
		if (!record) return;
		const day = dueDay(record, now);
		if (!day) return;
		try {
			await send(record.subscription, JSON.stringify(reminderLine(day)));
			await store.set(key, { ...record, sentDay: day });
			result.sent++;
		} catch (error) {
			const status = (error as { statusCode?: number }).statusCode;
			if (status === 404 || status === 410) {
				await store.delete(key);
				result.dropped++;
			} else {
				result.failed++;
				console.error("reminder not sent", status ?? error);
			}
		}
	}

	for (let i = 0; i < keys.length; i += BATCH)
		await Promise.all(keys.slice(i, i + BATCH).map(remind));
	return result;
}
