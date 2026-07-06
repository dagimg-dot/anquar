import { createSignal, For } from "solid-js";
import AppHeader from "../components/AppHeader";
import SettingsSection, {
	SettingsOption,
	SettingsOptionGroup,
	SettingsRowInfo,
	SettingsThemeOption,
} from "../components/SettingsSection";
import { db } from "../lib/db";
import { useTheme } from "../theme/ThemeContext";

const FONT_SIZES = ["XS", "S", "M", "L", "XL"] as const;
const FONT_SIZE_MAP: Record<string, number> = {
	XS: 85,
	S: 100,
	M: 130,
	L: 175,
	XL: 200,
};
const LINE_SPACINGS = [1.5, 1.7, 2.0] as const;
const ALIGNMENTS = ["top", "center"] as const;
const GOALS = [10, 20, 30, 50, 100] as const;
const MODELS = [
	"gemini-2.0-flash",
	"gemini-2.0-pro",
	"gpt-4o",
	"gpt-4o-mini",
	"claude-sonnet-4",
] as const;

export default function SettingsTab() {
	const { mode, setMode } = useTheme();
	const [apiKey, setApiKey] = createSignal(
		localStorage.getItem("buktok_api_key") || "",
	);
	const [showKey, setShowKey] = createSignal(false);
	const [saved, setSaved] = createSignal(false);
	const [model, setModel] = createSignal(
		localStorage.getItem("buktok_model") || MODELS[0],
	);
	const [fontSize, setFontSize] = createSignal("M");
	const [lineSpacing, setLineSpacing] = createSignal(1.7);
	const [alignment, setAlignment] = createSignal("top");
	const [goal, setGoal] = createSignal(30);

	db.readerSettings.get("global").then((record) => {
		if (record) {
			const sizeLabel =
				Object.entries(FONT_SIZE_MAP).find(
					([, v]) => v === record.fontSize,
				)?.[0] ?? "M";
			setFontSize(sizeLabel as (typeof FONT_SIZES)[number]);
			setLineSpacing(record.lineHeight);
			setAlignment(record.verticalAlign ?? "top");
		}
	});

	const saveGlobalDefaults = () => {
		db.readerSettings.put({
			bookId: "global",
			fontSize: FONT_SIZE_MAP[fontSize()],
			lineHeight: lineSpacing(),
			hPadding: 1.5,
			textColor: "",
			bgColor: "",
			themeId: "light",
			verticalAlign: alignment(),
		});
	};

	const saveApiKey = () => {
		localStorage.setItem("buktok_api_key", apiKey());
		setSaved(true);
		setTimeout(() => setSaved(false), 2000);
	};

	const saveModel = (value: string) => {
		setModel(value);
		localStorage.setItem("buktok_model", value);
	};

	const clearLibrary = async () => {
		if (
			confirm(
				"Are you sure you want to clear all books? This cannot be undone.",
			)
		) {
			await db.books.clear();
			await db.chapters.clear();
			await db.toc.clear();
			await db.progress.clear();
			await db.bookmarks.clear();
			await db.dailyRollups.clear();
			window.location.reload();
		}
	};

	return (
		<>
			<AppHeader />
			<div class="pb-24">
				<SettingsSection title="Appearance">
					<SettingsRowInfo
						label="App theme"
						desc="Syncs with your system by default"
					/>
					<SettingsOptionGroup>
						<SettingsThemeOption
							label="System"
							active={mode() === "system"}
							onClick={() => setMode("system")}
						>
							<svg
								aria-hidden="true"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<circle cx="12" cy="12" r="4" />
								<path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
							</svg>
						</SettingsThemeOption>
						<SettingsThemeOption
							label="Dark"
							active={mode() === "dark"}
							onClick={() => setMode("dark")}
						>
							<svg
								aria-hidden="true"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
							</svg>
						</SettingsThemeOption>
						<SettingsThemeOption
							label="Light"
							active={mode() === "light"}
							onClick={() => setMode("light")}
						>
							<svg
								aria-hidden="true"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<circle cx="12" cy="12" r="5" />
								<path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m11.32 11.32 1.42 1.42M1 12h2m18 0h2M5.64 17.36l-1.42 1.42M18.36 5.64l1.42-1.42" />
							</svg>
						</SettingsThemeOption>
					</SettingsOptionGroup>
				</SettingsSection>

				<SettingsSection title="Reader">
					<SettingsRowInfo
						label="Default font size"
						desc="Applies to new books"
					/>
					<SettingsOptionGroup>
						<For each={[...FONT_SIZES]}>
							{(s) => (
								<SettingsOption
									label={s}
									active={fontSize() === s}
									onClick={() => {
										setFontSize(s);
										saveGlobalDefaults();
									}}
								/>
							)}
						</For>
					</SettingsOptionGroup>
					<div style="margin-top: 14px;">
						<SettingsRowInfo label="Line spacing" />
					</div>
					<SettingsOptionGroup>
						<For each={[...LINE_SPACINGS]}>
							{(s) => (
								<SettingsOption
									label={String(s)}
									active={lineSpacing() === s}
									onClick={() => {
										setLineSpacing(s);
										saveGlobalDefaults();
									}}
								/>
							)}
						</For>
					</SettingsOptionGroup>
					<div style="margin-top: 14px;">
						<SettingsRowInfo label="Default alignment" />
					</div>
					<SettingsOptionGroup>
						<For each={[...ALIGNMENTS]}>
							{(a) => (
								<SettingsOption
									label={a.charAt(0).toUpperCase() + a.slice(1)}
									active={alignment() === a}
									onClick={() => {
										setAlignment(a);
										saveGlobalDefaults();
									}}
								/>
							)}
						</For>
					</SettingsOptionGroup>
				</SettingsSection>

				<SettingsSection title="Reading">
					<SettingsRowInfo
						label="Daily buktok goal"
						desc="Sets your target in the Reading Pulse"
					/>
					<SettingsOptionGroup class="goal-options">
						<For each={[...GOALS]}>
							{(g) => (
								<SettingsOption
									label={String(g)}
									active={goal() === g}
									onClick={() => setGoal(g)}
								/>
							)}
						</For>
					</SettingsOptionGroup>
				</SettingsSection>

				<SettingsSection title="AI">
					<SettingsRowInfo
						label="API key"
						desc="Your Gemini or OpenAI key (stored locally)"
					/>
					<div class="settings-api-field">
						<input
							type={showKey() ? "text" : "password"}
							class="settings-input"
							placeholder="sk-..."
							value={apiKey()}
							onInput={(e) => setApiKey(e.currentTarget.value)}
						/>
						<button
							type="button"
							class={`settings-icon-btn${showKey() ? " active" : ""}`}
							onClick={() => setShowKey(!showKey())}
							aria-label="Toggle visibility"
						>
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
						</button>
						<button
							type="button"
							class={`settings-icon-btn settings-icon-btn-check${saved() ? " saved" : ""}`}
							onClick={saveApiKey}
							aria-label="Save key"
						>
							<svg
								aria-hidden="true"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
							>
								<polyline points="20 6 9 17 4 12" />
							</svg>
						</button>
					</div>
					<div style="margin-top: 12px;">
						<SettingsRowInfo
							label="Model"
							desc="gemini-2.0-flash, gpt-4o, etc."
						/>
					</div>
					<div class="settings-api-field">
						<select
							class="settings-select"
							value={model()}
							onChange={(e) => saveModel(e.currentTarget.value)}
						>
							<For each={[...MODELS]}>
								{(m) => <option value={m}>{m}</option>}
							</For>
						</select>
					</div>
				</SettingsSection>

				<SettingsSection title="Data">
					<SettingsRowInfo
						label="Clear library"
						desc="Remove all books and reading data"
					>
						<button
							type="button"
							class="settings-danger-btn"
							onClick={clearLibrary}
						>
							Clear
						</button>
					</SettingsRowInfo>
				</SettingsSection>

				<div class="settings-footer">buktok · v0.1.0</div>
			</div>
		</>
	);
}
