import {
	createContext,
	createEffect,
	createSignal,
	onCleanup,
	type ParentComponent,
	useContext,
} from "solid-js";
import { loadReaderSettings, saveReaderSettings } from "./db.ts";

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

export interface ReaderSettings {
	bgColor: string;
	epubCssEnabled?: boolean;
	fontSize: number;
	hPadding: number;
	lineHeight: number;
	textColor: string;
	themeId: string;
	verticalAlign?: "top" | "center";
}

const DEFAULTS: ReaderSettings = {
	bgColor: "",
	epubCssEnabled: false,
	fontSize: 100,
	hPadding: 1.5,
	lineHeight: 1.7,
	textColor: "",
	themeId: "light",
	verticalAlign: "top",
};

export function getThemeColors(settings: ReaderSettings): {
	bgColor: string;
	textColor: string;
} {
	const theme = READER_THEMES.find((t) => t.id === settings.themeId);
	return {
		textColor: settings.textColor || theme?.textColor || "#1a1a1a",
		bgColor: settings.bgColor || theme?.bgColor || "#ffffff",
	};
}

interface ReaderSettingsContextValue {
	resetSettings: () => void;
	setSettings: (updates: Partial<ReaderSettings>) => void;
	settings: () => ReaderSettings;
	themeColors: () => { bgColor: string; textColor: string };
}

const ReaderSettingsCtx = createContext<ReaderSettingsContextValue>();

export const ReaderSettingsProvider: ParentComponent<{ bookId?: string }> = (
	props,
) => {
	const [settings, setSettings] = createSignal<ReaderSettings>({ ...DEFAULTS });
	const [loaded, setLoaded] = createSignal(false);

	const updateSettings = (updates: Partial<ReaderSettings>) => {
		setSettings((prev) => ({ ...prev, ...updates }));
	};

	const resetSettings = () => {
		setSettings({ ...DEFAULTS });
	};

	const themeColors = () => getThemeColors(settings());

	createEffect(() => {
		const bid = props.bookId;
		if (bid) {
			loadReaderSettings(bid).then(async (record) => {
				if (!record) {
					record = await loadReaderSettings("global");
				}
				if (record) {
					setSettings({
						bgColor: record.bgColor ?? "",
						epubCssEnabled: record.epubCssEnabled ?? false,
						fontSize: record.fontSize ?? DEFAULTS.fontSize,
						hPadding: record.hPadding ?? DEFAULTS.hPadding,
						lineHeight: record.lineHeight ?? DEFAULTS.lineHeight,
						textColor: record.textColor ?? "",
						themeId: record.themeId ?? DEFAULTS.themeId,
						verticalAlign:
							(record.verticalAlign as "top" | "center") ??
							DEFAULTS.verticalAlign,
					});
				}
				setLoaded(true);
			});
		} else {
			setLoaded(true);
		}
	});

	createEffect(() => {
		const bid = props.bookId;
		if (loaded() && bid) {
			const timer = setTimeout(() => {
				saveReaderSettings(bid, settings());
			}, 300);
			onCleanup(() => clearTimeout(timer));
		}
	});

	return (
		<ReaderSettingsCtx.Provider
			value={{
				settings,
				setSettings: updateSettings,
				resetSettings,
				themeColors,
			}}
		>
			{props.children}
		</ReaderSettingsCtx.Provider>
	);
};

export function useReaderSettings(): ReaderSettingsContextValue {
	const ctx = useContext(ReaderSettingsCtx);
	if (!ctx) {
		throw new Error(
			"useReaderSettings must be used within ReaderSettingsProvider",
		);
	}
	return ctx;
}
