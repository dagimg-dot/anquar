import { describe, expect, it } from "vitest";
import {
	dueDay,
	isPushEndpoint,
	isTimeZone,
	minutesOf,
	type ReminderRecord,
	readingDayIn,
	reminderLine,
	SEND_WINDOW_MIN,
} from "./reminder-schedule.ts";

const sub = {
	endpoint: "https://fcm.googleapis.com/fcm/send/abc",
	keys: { p256dh: "p", auth: "a" },
};
const record = (over: Partial<ReminderRecord> = {}): ReminderRecord => ({
	subscription: sub,
	time: "20:00",
	tz: "Africa/Addis_Ababa", // UTC+3, no daylight saving
	...over,
});
// 20:00 in Addis Ababa is 17:00 UTC.
const at = (hhmm: string, date = "2026-10-04") =>
	new Date(`${date}T${hhmm}:00Z`);

describe("what a phone may ask for", () => {
	it("takes only the push services browsers use", () => {
		expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/x")).toBe(true);
		expect(
			isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x"),
		).toBe(true);
		expect(isPushEndpoint("https://web.push.apple.com/x")).toBe(true);
		expect(isPushEndpoint("https://wns2.notify.windows.com/x")).toBe(true);
		expect(isPushEndpoint("https://evil.example/fcm.googleapis.com")).toBe(
			false,
		);
		expect(isPushEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(
			false,
		);
		expect(isPushEndpoint("http://fcm.googleapis.com/x")).toBe(false);
		expect(isPushEndpoint(42)).toBe(false);
	});

	it("reads a time of day", () => {
		expect(minutesOf("20:00")).toBe(1200);
		expect(minutesOf("00:05")).toBe(5);
		expect(minutesOf("24:00")).toBeUndefined();
		expect(minutesOf("8:00")).toBeUndefined();
		expect(minutesOf(undefined)).toBeUndefined();
	});

	it("knows a time zone when it sees one", () => {
		expect(isTimeZone("Africa/Addis_Ababa")).toBe(true);
		expect(isTimeZone("Mars/Olympus")).toBe(false);
	});
});

describe("when a reminder is due", () => {
	it("is due from its time, in the phone's own zone", () => {
		expect(dueDay(record(), at("16:59"))).toBeUndefined();
		expect(dueDay(record(), at("17:00"))).toBe("2026-10-04");
		expect(dueDay(record(), at("18:29"))).toBe("2026-10-04");
	});

	it("goes stale after the window", () => {
		expect(dueDay(record(), at("18:30"))).toBeUndefined();
		expect(SEND_WINDOW_MIN).toBe(90);
	});

	it("is sent once a day", () => {
		expect(
			dueDay(record({ sentDay: "2026-10-04" }), at("17:15")),
		).toBeUndefined();
		expect(dueDay(record({ sentDay: "2026-10-03" }), at("17:15"))).toBe(
			"2026-10-04",
		);
	});

	it("stays quiet on a day whose goal is closed, and not on the next", () => {
		expect(
			dueDay(record({ closedDay: "2026-10-04" }), at("17:15")),
		).toBeUndefined();
		expect(dueDay(record({ closedDay: "2026-10-03" }), at("17:15"))).toBe(
			"2026-10-04",
		);
	});

	it("keeps the reading day of the reminder across 4 a.m.", () => {
		// 03:30 in Addis is 00:30 UTC. At 04:15 the reading day has turned, but this reminder is still the night's.
		const r = record({ time: "03:30" });
		expect(dueDay(r, at("00:35", "2026-10-05"))).toBe("2026-10-04");
		expect(dueDay(r, at("01:15", "2026-10-05"))).toBe("2026-10-04");
		expect(
			dueDay({ ...r, sentDay: "2026-10-04" }, at("01:15", "2026-10-05")),
		).toBeUndefined();
	});

	it("follows a phone to another zone", () => {
		const nyc = record({ tz: "America/New_York" }); // 20:00 EDT is 00:00 UTC next day
		expect(dueDay(nyc, at("00:10", "2026-10-05"))).toBe("2026-10-04");
		expect(dueDay(nyc, at("17:10"))).toBeUndefined();
	});

	it("counts the day as ending at 4 a.m.", () => {
		expect(readingDayIn(at("00:59", "2026-10-05"), "Africa/Addis_Ababa")).toBe(
			"2026-10-04",
		);
		expect(readingDayIn(at("01:00", "2026-10-05"), "Africa/Addis_Ababa")).toBe(
			"2026-10-05",
		);
	});
});

describe("what it says", () => {
	it("is the same all day, changes by the day and never names a book", () => {
		expect(reminderLine("2026-10-04")).toEqual(reminderLine("2026-10-04"));
		const lines = new Set(
			Array.from(
				{ length: 20 },
				(_, i) =>
					reminderLine(`2026-10-${String(i + 1).padStart(2, "0")}`).body,
			),
		);
		expect(lines.size).toBeGreaterThan(3);
		expect(reminderLine("2026-10-04").title).toBe("anquar");
	});
});
