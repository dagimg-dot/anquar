// The app's tabs, in the order of the bottom bar and the sidebar, which both draw from this.
export const TABS = [
	{ id: "feed", label: "Feed" },
	{ id: "library", label: "Library" },
	{ id: "saved", label: "Saved" },
	{ id: "settings", label: "Settings" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export const tabLabel = (id: TabId) =>
	TABS.find((tab) => tab.id === id)?.label ?? "";

/** The tab a number key opens: 1 is the first. */
export const tabForKey = (key: string): TabId | undefined =>
	/^[1-9]$/.test(key) ? TABS[Number(key) - 1]?.id : undefined;
