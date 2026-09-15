import { For } from "solid-js";
import {
	LINE_HEIGHTS,
	RAIL_RESTS,
	READER_THEMES,
	useReaderSettings,
} from "../lib/reader-settings.tsx";

const FONT_SIZES = [75, 90, 100, 115, 130, 150, 175, 200] as const;

function Divider() {
	return <div class="my-4 h-px bg-border-light" />;
}

function Segmented<T>(props: {
	onSelect: (value: T) => void;
	options: readonly { label: string; value: T }[];
	selected: T;
}) {
	return (
		<div class="flex gap-0.5 rounded-[0.7rem] bg-surface-elevated p-[3px]">
			<For each={props.options}>
				{(option) => (
					<button
						class="flex-1 rounded-[0.55rem] py-[7px] font-medium text-[13px] transition-colors"
						classList={{
							"bg-canvas text-ink shadow-sm": props.selected === option.value,
							"text-ink-soft": props.selected !== option.value,
						}}
						onClick={() => props.onSelect(option.value)}
						type="button"
					>
						{option.label}
					</button>
				)}
			</For>
		</div>
	);
}

export default function ReaderSettingsPanel() {
	const { settings, setSettings } = useReaderSettings();

	const sizeIndex = () =>
		FONT_SIZES.indexOf(settings().fontSize as (typeof FONT_SIZES)[number]);

	const stepSize = (by: number) => {
		const next = sizeIndex() + by;
		if (next >= 0 && next < FONT_SIZES.length) {
			setSettings({ fontSize: FONT_SIZES[next] });
		}
	};

	return (
		<div class="pb-1">
			{/* Two weights of A, the way Apple Books steps type size. */}
			<div class="flex gap-0.5 rounded-[0.7rem] bg-surface-elevated p-[3px]">
				<button
					aria-label="Smaller text"
					class="flex flex-1 items-center justify-center rounded-[0.55rem] py-2 text-ink transition-colors active:bg-canvas disabled:opacity-30"
					disabled={sizeIndex() <= 0}
					onClick={() => stepSize(-1)}
					type="button"
				>
					<span class="text-[13px]">A</span>
				</button>
				<div class="my-1.5 w-px bg-border-light" />
				<button
					aria-label="Larger text"
					class="flex flex-1 items-center justify-center rounded-[0.55rem] py-2 text-ink transition-colors active:bg-canvas disabled:opacity-30"
					disabled={sizeIndex() >= FONT_SIZES.length - 1}
					onClick={() => stepSize(1)}
					type="button"
				>
					<span class="text-[19px]">A</span>
				</button>
			</div>

			<Divider />

			<div class="grid grid-cols-3 gap-2">
				<For each={READER_THEMES}>
					{(theme) => (
						<button
							class="flex flex-col items-center gap-0.5 rounded-xl py-3 transition-transform active:scale-95"
							classList={{
								"ring-2 ring-ink": settings().themeId === theme.id,
								"ring-1 ring-border-light": settings().themeId !== theme.id,
							}}
							onClick={() =>
								setSettings({ themeId: theme.id, textColor: "", bgColor: "" })
							}
							style={{ background: theme.bgColor, color: theme.textColor }}
							type="button"
						>
							<span class="font-semibold text-xl leading-none">Aa</span>
							<span class="text-[11px] opacity-70">{theme.label}</span>
						</button>
					)}
				</For>
			</div>

			<Divider />

			<div class="mb-2 font-medium text-[13px] text-ink-soft">Spacing</div>
			<Segmented
				onSelect={(value) => setSettings({ lineHeight: value })}
				options={LINE_HEIGHTS}
				selected={settings().lineHeight}
			/>

			<div class="mt-4 mb-2 font-medium text-[13px] text-ink-soft">Align</div>
			<Segmented
				onSelect={(value) => setSettings({ verticalAlign: value })}
				options={
					[
						{ label: "Top", value: "top" },
						{ label: "Center", value: "center" },
					] as const
				}
				selected={settings().verticalAlign ?? "center"}
			/>

			<div class="mt-4 mb-2 font-medium text-[13px] text-ink-soft">Rail</div>
			<Segmented
				onSelect={(value) => setSettings({ railRest: value })}
				options={RAIL_RESTS}
				selected={settings().railRest}
			/>

			<Divider />

			<div class="flex gap-3">
				<label class="flex flex-1 items-center gap-2">
					<span class="shrink-0 font-medium text-[13px] text-ink-soft">
						Text
					</span>
					<input
						class="h-8 w-full cursor-pointer rounded-lg border border-border-light"
						onChange={(e) => setSettings({ textColor: e.target.value })}
						type="color"
						value={settings().textColor || "#1a1a1a"}
					/>
				</label>
				<label class="flex flex-1 items-center gap-2">
					<span class="shrink-0 font-medium text-[13px] text-ink-soft">
						Page
					</span>
					<input
						class="h-8 w-full cursor-pointer rounded-lg border border-border-light"
						onChange={(e) => setSettings({ bgColor: e.target.value })}
						type="color"
						value={settings().bgColor || "#ffffff"}
					/>
				</label>
			</div>
		</div>
	);
}
