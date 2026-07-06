import { createSignal, For } from "solid-js";
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
		<div class="py-4">
			{/* Appearance */}
			<div class="px-5 mb-7">
				<div class="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-3">
					Appearance
				</div>
				<div class="flex items-center justify-between mb-2.5">
					<div class="min-w-0">
						<div class="text-base font-medium">App theme</div>
						<div class="text-xs text-ink-soft/60 mt-px">
							Syncs with your system by default
						</div>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						class="flex-1 flex flex-col items-center gap-1 py-3 px-3 rounded-xl bg-surface border border-border text-ink-soft text-sm font-medium cursor-pointer transition-all duration-300 active:scale-95"
						classList={{
							"!bg-brand-500/12 !border-brand-500 !text-brand-500":
								mode() === "system",
						}}
						onClick={() => setMode("system")}
					>
						<svg
							aria-hidden="true"
							class="w-5 h-5 shrink-0"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<circle cx="12" cy="12" r="4" />
							<path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
						</svg>
						System
					</button>
					<button
						type="button"
						class="flex-1 flex flex-col items-center gap-1 py-3 px-3 rounded-xl bg-surface border border-border text-ink-soft text-sm font-medium cursor-pointer transition-all duration-300 active:scale-95"
						classList={{
							"!bg-brand-500/12 !border-brand-500 !text-brand-500":
								mode() === "dark",
						}}
						onClick={() => setMode("dark")}
					>
						<svg
							aria-hidden="true"
							class="w-5 h-5 shrink-0"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
						</svg>
						Dark
					</button>
					<button
						type="button"
						class="flex-1 flex flex-col items-center gap-1 py-3 px-3 rounded-xl bg-surface border border-border text-ink-soft text-sm font-medium cursor-pointer transition-all duration-300 active:scale-95"
						classList={{
							"!bg-brand-500/12 !border-brand-500 !text-brand-500":
								mode() === "light",
						}}
						onClick={() => setMode("light")}
					>
						<svg
							aria-hidden="true"
							class="w-5 h-5 shrink-0"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="1.5"
						>
							<circle cx="12" cy="12" r="5" />
							<path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m11.32 11.32 1.42 1.42M1 12h2m18 0h2M5.64 17.36l-1.42 1.42M18.36 5.64l1.42-1.42" />
						</svg>
						Light
					</button>
				</div>
			</div>

			{/* Reader */}
			<div class="px-5 mb-7">
				<div class="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-3">
					Reader
				</div>
				<div class="flex items-center justify-between mb-2.5">
					<div class="min-w-0">
						<div class="text-base font-medium">Default font size</div>
						<div class="text-xs text-ink-soft/60 mt-px">
							Applies to new books
						</div>
					</div>
				</div>
				<div class="flex gap-2 mb-3.5">
					<For each={[...FONT_SIZES]}>
						{(s) => (
							<button
								type="button"
								class="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl bg-surface border border-border text-ink-soft text-sm font-medium cursor-pointer transition-all duration-300 active:scale-95"
								classList={{
									"!bg-brand-500/12 !border-brand-500 !text-brand-500":
										fontSize() === s,
								}}
								onClick={() => {
									setFontSize(s);
									saveGlobalDefaults();
								}}
							>
								{s}
							</button>
						)}
					</For>
				</div>
				<div class="flex items-center justify-between mb-2.5">
					<div class="min-w-0">
						<div class="text-base font-medium">Line spacing</div>
					</div>
				</div>
				<div class="flex gap-2 mb-3.5">
					<For each={[...LINE_SPACINGS]}>
						{(s) => (
							<button
								type="button"
								class="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl bg-surface border border-border text-ink-soft text-sm font-medium cursor-pointer transition-all duration-300 active:scale-95"
								classList={{
									"!bg-brand-500/12 !border-brand-500 !text-brand-500":
										lineSpacing() === s,
								}}
								onClick={() => {
									setLineSpacing(s);
									saveGlobalDefaults();
								}}
							>
								{s}
							</button>
						)}
					</For>
				</div>
				<div class="flex items-center justify-between mb-2.5">
					<div class="min-w-0">
						<div class="text-base font-medium">Default alignment</div>
					</div>
				</div>
				<div class="flex gap-2">
					<For each={[...ALIGNMENTS]}>
						{(a) => (
							<button
								type="button"
								class="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl bg-surface border border-border text-ink-soft text-sm font-medium cursor-pointer transition-all duration-300 active:scale-95"
								classList={{
									"!bg-brand-500/12 !border-brand-500 !text-brand-500":
										alignment() === a,
								}}
								onClick={() => {
									setAlignment(a);
									saveGlobalDefaults();
								}}
							>
								{a.charAt(0).toUpperCase() + a.slice(1)}
							</button>
						)}
					</For>
				</div>
			</div>

			{/* Reading */}
			<div class="px-5 mb-7">
				<div class="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-3">
					Reading
				</div>
				<div class="flex items-center justify-between mb-2.5">
					<div class="min-w-0">
						<div class="text-base font-medium">Daily buktok goal</div>
						<div class="text-xs text-ink-soft/60 mt-px">
							Sets your target in the Reading Pulse
						</div>
					</div>
				</div>
				<div class="flex gap-2">
					<For each={[...GOALS]}>
						{(g) => (
							<button
								type="button"
								class="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-surface border border-border text-base font-semibold cursor-pointer transition-all duration-300 active:scale-95"
								classList={{
									"!bg-brand-500/12 !border-brand-500 !text-brand-500":
										goal() === g,
								}}
								onClick={() => setGoal(g)}
							>
								{g}
							</button>
						)}
					</For>
				</div>
			</div>

			{/* AI */}
			<div class="px-5 mb-7">
				<div class="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-3">
					AI
				</div>
				<div class="flex items-center justify-between mb-2.5">
					<div class="min-w-0">
						<div class="text-base font-medium">API key</div>
						<div class="text-xs text-ink-soft/60 mt-px">
							Your Gemini or OpenAI key (stored locally)
						</div>
					</div>
				</div>
				<div class="flex gap-2">
					<input
						type={showKey() ? "text" : "password"}
						class="flex-1 py-2.5 px-3.5 rounded-xl bg-surface border border-border text-ink text-sm font-mono outline-none transition-colors duration-200 focus:border-brand-500 placeholder:text-ink-soft/40"
						placeholder="sk-..."
						value={apiKey()}
						onInput={(e) => setApiKey(e.currentTarget.value)}
					/>
					<button
						type="button"
						class="w-10 h-10 rounded-xl bg-surface border border-border text-ink-soft shrink-0 cursor-pointer flex items-center justify-center transition-all duration-300 active:scale-90"
						classList={{ "!text-brand-500 !border-brand-500": showKey() }}
						onClick={() => setShowKey(!showKey())}
						aria-label="Toggle visibility"
					>
						<svg
							aria-hidden="true"
							class="w-4.5 h-4.5"
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
						class="w-10 h-10 rounded-xl bg-surface border border-border shrink-0 cursor-pointer flex items-center justify-center transition-all duration-300 active:scale-90"
						classList={{
							"!bg-brand-500 !text-white !border-brand-500": saved(),
							"text-ink-soft": !saved(),
						}}
						onClick={saveApiKey}
						aria-label="Save key"
					>
						<svg
							aria-hidden="true"
							class="w-4.5 h-4.5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</button>
				</div>
				<div class="flex items-center justify-between mt-3 mb-2.5">
					<div class="min-w-0">
						<div class="text-base font-medium">Model</div>
						<div class="text-xs text-ink-soft/60 mt-px">
							gemini-2.0-flash, gpt-4o, etc.
						</div>
					</div>
				</div>
				<div class="flex gap-2">
					<select
						class="flex-1 py-2.5 px-3.5 rounded-xl bg-surface border border-border text-ink text-sm outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23666%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_12px_center] transition-colors duration-200 focus:border-brand-500"
						value={model()}
						onChange={(e) => saveModel(e.currentTarget.value)}
					>
						<For each={[...MODELS]}>
							{(m) => <option value={m}>{m}</option>}
						</For>
					</select>
				</div>
			</div>

			{/* Data */}
			<div class="px-5 mb-7">
				<div class="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-3">
					Data
				</div>
				<div class="flex items-center justify-between">
					<div class="min-w-0">
						<div class="text-base font-medium">Clear library</div>
						<div class="text-xs text-ink-soft/60 mt-px">
							Remove all books and reading data
						</div>
					</div>
					<button
						type="button"
						class="py-2 px-4 rounded-xl bg-[oklch(0.5_0.18_30/0.12)] border border-[oklch(0.5_0.18_30/0.25)] text-[oklch(0.6_0.2_30)] text-sm font-semibold shrink-0 cursor-pointer transition-colors duration-300 active:bg-[oklch(0.5_0.18_30/0.2)]"
						onClick={clearLibrary}
					>
						Clear
					</button>
				</div>
			</div>

			{/* Footer */}
			<div class="text-center py-8 px-5 text-xs text-ink-soft/60">
				buktok · v0.1.0
			</div>
		</div>
	);
}
