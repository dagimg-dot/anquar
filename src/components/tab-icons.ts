import { Bookmark, BookOpen, Books, GearSix } from "phosphor-solid";
import type { TabId } from "../lib/tabs";

// Kept apart from the tab list so that the list stays plain data, which the tests can load.
export const TAB_ICONS = {
	feed: BookOpen,
	library: Books,
	saved: Bookmark,
	settings: GearSix,
} as const satisfies Record<TabId, unknown>;
