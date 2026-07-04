import { READER_THEMES, useReaderSettings } from "../lib/reader-settings.tsx";

const FONT_SIZES = [75, 90, 100, 115, 130, 150, 175, 200] as const;
const LINE_HEIGHTS = [1.3, 1.5, 1.7, 1.9, 2.1] as const;

function lineHeightLabel(lh: number): string {
	if (lh === 1.3) {
		return "Compact";
	}
	if (lh === 1.7) {
		return "Default";
	}
	return `${lh}`;
}

export default function ReaderSettingsPanel() {
	const { settings, setSettings } = useReaderSettings();

	const fontSizeLabel = () => {
		const idx = FONT_SIZES.indexOf(
			settings().fontSize as (typeof FONT_SIZES)[number],
		);
		if (idx <= 1) {
			return "XS";
		}
		if (idx <= 3) {
			return "S";
		}
		if (idx <= 5) {
			return "M";
		}
		if (idx <= 6) {
			return "L";
		}
		return "XL";
	};

	return (
		<div class="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-xl">
			{/* Font size */}
			<div class="flex items-center justify-between gap-3">
				<span class="shrink-0 font-medium text-ink text-sm">Size</span>
				<div class="flex items-center gap-2">
					<button
						aria-label="Decrease font size"
						class="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:bg-surface"
						onClick={() => {
							const idx = FONT_SIZES.indexOf(
								settings().fontSize as (typeof FONT_SIZES)[number],
							);
							if (idx > 0) {
								setSettings({ fontSize: FONT_SIZES[idx - 1] });
							}
						}}
						type="button"
					>
						<span class="text-lg">−</span>
					</button>
					<span class="min-w-[2rem] text-center font-medium text-ink text-sm tabular-nums">
						{fontSizeLabel()}
					</span>
					<button
						aria-label="Increase font size"
						class="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink transition-colors hover:bg-surface"
						onClick={() => {
							const idx = FONT_SIZES.indexOf(
								settings().fontSize as (typeof FONT_SIZES)[number],
							);
							if (idx < FONT_SIZES.length - 1) {
								setSettings({ fontSize: FONT_SIZES[idx + 1] });
							}
						}}
						type="button"
					>
						<span class="text-lg">+</span>
					</button>
				</div>
			</div>

			{/* Line spacing */}
			<div class="flex items-center justify-between gap-3">
				<span class="shrink-0 font-medium text-ink text-sm">Spacing</span>
				<div class="flex items-center gap-1">
					{LINE_HEIGHTS.map((lh) => (
						<button
							class="rounded-lg px-3 py-1.5 font-medium text-xs transition-colors"
							classList={{
								"bg-brand-500 text-white": settings().lineHeight === lh,
								"border border-border text-ink hover:bg-surface":
									settings().lineHeight !== lh,
							}}
							onClick={() => setSettings({ lineHeight: lh })}
							type="button"
						>
							{lineHeightLabel(lh)}
						</button>
					))}
				</div>
			</div>

			{/* Theme */}
			<div>
				<span class="mb-2 block font-medium text-ink text-sm">Theme</span>
				<div class="flex gap-2">
					{READER_THEMES.map((theme) => (
						<button
							aria-label={theme.label}
							class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 transition-colors"
							classList={{
								"border-brand-500": settings().themeId === theme.id,
								"border-transparent": settings().themeId !== theme.id,
							}}
							onClick={() =>
								setSettings({ themeId: theme.id, textColor: "", bgColor: "" })
							}
							title={theme.label}
							type="button"
						>
							<span
								class="flex h-full w-full items-center justify-center rounded-full"
								style={{ background: theme.bgColor }}
							>
								<span
									class="h-3 w-1 rounded-full"
									style={{ background: theme.textColor }}
								/>
							</span>
						</button>
					))}
				</div>
			</div>

			{/* Custom colors */}
			<div class="flex gap-3">
				<label class="flex flex-1 items-center gap-2">
					<span class="shrink-0 font-medium text-ink text-xs">Text</span>
					<input
						class="h-7 w-full cursor-pointer rounded border border-border"
						onChange={(e) => setSettings({ textColor: e.target.value })}
						type="color"
						value={settings().textColor || "#1a1a1a"}
					/>
				</label>
				<label class="flex flex-1 items-center gap-2">
					<span class="shrink-0 font-medium text-ink text-xs">Bg</span>
					<input
						class="h-7 w-full cursor-pointer rounded border border-border"
						onChange={(e) => setSettings({ bgColor: e.target.value })}
						type="color"
						value={settings().bgColor || "#ffffff"}
					/>
				</label>
			</div>
		</div>
	);
}
