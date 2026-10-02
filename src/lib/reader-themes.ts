// The reader's own page colours, apart from the app's theme. Plain data, so the landing page's reader demo
// draws the same five without the reader's settings store.
export interface ReaderTheme {
	bgColor: string;
	id: string;
	label: string;
	textColor: string;
}

export const READER_THEMES: ReaderTheme[] = [
	{ id: "light", label: "Light", textColor: "#1a1a1a", bgColor: "#ffffff" },
	{ id: "dark", label: "Dark", textColor: "#e0e0e0", bgColor: "#1a1a1a" },
	{ id: "sepia", label: "Sepia", textColor: "#5b4636", bgColor: "#f1e8d0" },
	{ id: "cream", label: "Cream", textColor: "#3c3836", bgColor: "#fbf1c7" },
	{ id: "amoled", label: "AMOLED", textColor: "#ffffff", bgColor: "#000000" },
];

/**
 * The rail sits on the reader's page, not the app's, so its accents have to
 * clear five backgrounds the app theme knows nothing about. A custom page
 * colour has no matching pair, so those fall back to the reader's own ink.
 */
export const THEME_ACCENTS: Record<string, { save: string }> = {
	light: { save: "#2f6b4a" },
	dark: { save: "#7fc79b" },
	sepia: { save: "#4a6b52" },
	cream: { save: "#3f6b4f" },
	amoled: { save: "#7fc79b" },
};
