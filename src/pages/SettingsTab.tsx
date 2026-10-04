import { createSignal, For, Show } from "solid-js";
import GeminiSettings from "../components/GeminiSettings";
import LibraryData from "../components/LibraryData";
import ReminderSettings from "../components/ReminderSettings";
import SettingsNav from "../components/SettingsNav";
import SettingsSection, {
	SettingsOption,
	SettingsOptionGroup,
	SettingsRowInfo,
	SettingsThemeOption,
} from "../components/SettingsSection";
import { VERSION } from "../lib/changelog";
import { db } from "../lib/db";
import { canInstall, install } from "../lib/install";
import { RAIL_RESTS, railRest, setRailRest } from "../lib/reader-settings";
import { readingGoal, setReadingGoal } from "../lib/reading";
import { openWhatsNew } from "../lib/update";
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
export default function SettingsTab() {
	const { mode, setMode } = useTheme();
	const [fontSize, setFontSize] = createSignal("M");
	const [lineSpacing, setLineSpacing] = createSignal(1.7);
	const [alignment, setAlignment] = createSignal("top");
	const [goal, setGoal] = createSignal(readingGoal());

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

	return (
		<div class="pb-24 tablet:max-w-[40rem] desktop:grid desktop:pt-3 desktop:max-w-none desktop:grid-cols-[10.5rem_minmax(0,40rem)] desktop:gap-x-14">
			<SettingsNav />
			<SettingsSection title="App">
				{/* Still there for anyone who said not now to the Feed tab's card. */}
				<Show when={canInstall()}>
					<SettingsRowInfo
						desc="Full screen, offline, and in your share sheet"
						label="Install anquar"
					>
						<button
							class="shrink-0 rounded-full bg-brand-500 px-4 py-2 font-semibold text-[13.5px] text-canvas transition-transform active:scale-95"
							onClick={() => void install()}
							type="button"
						>
							Install
						</button>
					</SettingsRowInfo>
				</Show>
				<SettingsRowInfo desc="What each update brought" label="What's new">
					<button
						class="min-w-[5.5rem] shrink-0 cursor-pointer rounded-xl border border-border bg-surface px-4 py-2 text-center font-semibold text-sm transition-transform duration-200 active:scale-95"
						onClick={openWhatsNew}
						type="button"
					>
						Open
					</button>
				</SettingsRowInfo>
			</SettingsSection>

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
							class="w-4 h-4 shrink-0"
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
							class="w-4 h-4 shrink-0"
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
							class="w-4 h-4 shrink-0"
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
				<div style="margin-top: 14px;">
					<SettingsRowInfo
						desc="How much the reader's buttons show between taps"
						label="Rail"
					/>
				</div>
				<SettingsOptionGroup>
					<For each={[...RAIL_RESTS]}>
						{(rest) => (
							<SettingsOption
								active={railRest() === rest.value}
								label={rest.label}
								onClick={() => setRailRest(rest.value)}
							/>
						)}
					</For>
				</SettingsOptionGroup>
			</SettingsSection>

			<SettingsSection title="Reading">
				<SettingsRowInfo
					label="Daily anquar goal"
					desc="Sets your target in the Reading Pulse"
				/>
				<SettingsOptionGroup>
					<For each={[...GOALS]}>
						{(g) => (
							<SettingsOption
								label={String(g)}
								active={goal() === g}
								onClick={() => {
									setGoal(g);
									setReadingGoal(g);
								}}
							/>
						)}
					</For>
				</SettingsOptionGroup>
				<ReminderSettings />
			</SettingsSection>

			<GeminiSettings />

			<SettingsSection title="Data">
				<LibraryData />
			</SettingsSection>

			<div class="text-center py-8 px-5 text-xs text-ink-muted desktop:col-start-2">
				anquar · v{VERSION}
			</div>
		</div>
	);
}
