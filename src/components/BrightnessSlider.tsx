import { Sun } from "phosphor-solid";
import { createSignal } from "solid-js";
import { brightness, MIN_BRIGHTNESS, setBrightness } from "../lib/brightness";
import { tick } from "../lib/haptics";
import type { RailRest } from "../lib/reader-settings";
import { useReaderSettings } from "../lib/reader-settings";

const STEP = 0.05;

// The reader's brightness, on the left edge where the thumb rests: drag up for brighter, down for dimmer.
// It wears the rail's look and comes and goes with it (the .rail data attributes in index.css), and a
// tick marks either end.
export default function BrightnessSlider(props: {
	rest: RailRest;
	shown: boolean;
}) {
	const { themeColors } = useReaderSettings();
	const [dragging, setDragging] = createSignal(false);
	let track: HTMLDivElement | undefined;

	const filled = () =>
		((brightness() - MIN_BRIGHTNESS) / (1 - MIN_BRIGHTNESS)) * 100;

	const change = (level: number) => {
		const before = brightness();
		setBrightness(level);
		const now = brightness();
		if (now !== before && (now === 1 || now === MIN_BRIGHTNESS)) tick();
	};

	const follow = (y: number) => {
		if (!track) return;
		const rect = track.getBoundingClientRect();
		const up = 1 - Math.min(1, Math.max(0, (y - rect.top) / rect.height));
		change(MIN_BRIGHTNESS + up * (1 - MIN_BRIGHTNESS));
	};

	return (
		<div
			class="rail fixed left-3 z-40"
			data-rest={props.rest}
			data-shown={props.shown}
			style={{
				bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)",
				color: themeColors().textColor,
				"--rail-halo": themeColors().bgColor,
			}}
		>
			<div class="rail-item flex flex-col items-center gap-3">
				<div
					aria-label="Brightness"
					aria-valuemax={100}
					aria-valuemin={Math.round(MIN_BRIGHTNESS * 100)}
					aria-valuenow={Math.round(brightness() * 100)}
					class="grid h-44 w-11 cursor-pointer touch-none place-items-center"
					onKeyDown={(e) => {
						if (e.key === "ArrowUp") change(brightness() + STEP);
						else if (e.key === "ArrowDown") change(brightness() - STEP);
						else return;
						e.preventDefault();
					}}
					onPointerCancel={() => setDragging(false)}
					onPointerDown={(e) => {
						e.currentTarget.setPointerCapture(e.pointerId);
						setDragging(true);
						follow(e.clientY);
					}}
					onPointerMove={(e) => dragging() && follow(e.clientY)}
					onPointerUp={() => setDragging(false)}
					role="slider"
					tabIndex={0}
				>
					<div
						class="relative h-full overflow-hidden rounded-full transition-[width] duration-200"
						ref={track}
						style={{
							width: dragging() ? "12px" : "6px",
							background: "color-mix(in srgb, currentColor 22%, transparent)",
							"box-shadow": "0 0 6px var(--rail-halo)",
						}}
					>
						<div
							class="absolute inset-x-0 bottom-0 rounded-full bg-current"
							style={{ height: `${filled()}%` }}
						/>
					</div>
				</div>
				<span class="rail-glyph">
					<Sun aria-hidden="true" size={22} weight="fill" />
				</span>
			</div>
		</div>
	);
}
