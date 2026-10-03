// What each release brought, newest first, in a reader's words. The app's version is the newest release's,
// so a release is made by adding one here. vite.config.ts also writes this to /app/changelog.json, where an
// older copy of the app reads what an update brings before taking it.

export interface Release {
	/** major.minor.patch */
	version: string;
	/** YYYY-MM-DD */
	date: string;
	title: string;
	notes: string[];
}

export const RELEASES: Release[] = [
	{
		version: "0.1.2",
		date: "2026-10-03",
		title: "Hear a word, dim the page",
		notes: [
			"Hear a word said aloud from the speaker beside it in Explain.",
			"Dim the page from the lamp on the rail: press it and slide.",
			"anquar tells you when an update is ready, and what it brings.",
		],
	},
	{
		version: "0.1.1",
		date: "2026-10-02",
		title: "Pick, explain, share",
		notes: [
			"Hold a word to pick it, and slide on to take more.",
			"Explain asks about just the words you tap.",
			"Share a passage as an image framed by its book's cover.",
			"Move your library to another phone in one file.",
			"New type: Hanken Grotesk for the app, Source Serif 4 for books.",
			"Install anquar from inside the app.",
		],
	},
	{
		version: "0.1.0",
		date: "2026-09-30",
		title: "Cards, a streak, a mark",
		notes: [
			"The Reading Pulse: a daily goal, a streak, and rest days.",
			"Add books from the Library tab, or share them to anquar.",
			"A new icon, and a splash that lands in the header.",
		],
	},
];

export const VERSION = RELEASES[0].version;

/** Whether version a comes after b, compared number by number, so 0.1.10 follows 0.1.9. */
export function newer(a: string, b: string): boolean {
	const x = a.split(".").map(Number);
	const y = b.split(".").map(Number);
	for (let i = 0; i < Math.max(x.length, y.length); i++) {
		const d = (x[i] ?? 0) - (y[i] ?? 0);
		if (d !== 0) return d > 0;
	}
	return false;
}

export const releasesAfter = (seen: string, releases = RELEASES) =>
	releases.filter((r) => newer(r.version, seen));
