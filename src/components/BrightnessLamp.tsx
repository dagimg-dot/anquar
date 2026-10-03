import { createSignal, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { brightness, MIN_BRIGHTNESS, setBrightness } from "../lib/brightness";
import { tick } from "../lib/haptics";

const STEP = 0.05;
// A slide this long takes the page from full brightness to the floor.
const RANGE_PX = 190;
const PINNED_MS = 4000;

// Phosphor's Lamp, its shade filled as far as the page is lit.
const SHADE =
	"M69.28 40h117.44a8 8 0 0 1 7.35 4.85l41.15 96A8 8 0 0 1 227.87 152H28.13a8 8 0 0 1-7.35-11.15l41.15-96A8 8 0 0 1 69.28 40Z";

function LampGlyph(props: { lit: number; size: number }) {
	return (
		<svg
			aria-hidden="true"
			fill="none"
			height={props.size}
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="16"
			viewBox="0 0 256 256"
			width={props.size}
		>
			<path
				d={SHADE}
				fill="currentColor"
				fill-opacity={0.06 + 0.5 * props.lit}
				stroke="none"
			/>
			<path d={SHADE} />
			<path d="M128 152v64M96 216h64M200 152v40" />
		</svg>
	);
}

// The reader's brightness, a lamp on the rail. Press it and slide: a pill grows out of it, left of the thumb,
// and the page dims as you go. A tap leaves the pill open until the page is tapped, and on the pill a tap or
// a slide puts the level where the finger is.
export default function BrightnessLamp(props: {
	onOpen: (open: boolean) => void;
	order: number;
}) {
	const [open, setOpen] = createSignal(false);
	const [pinned, setPinned] = createSignal(false);
	let pill: HTMLDivElement | undefined;
	let closeTimer = 0;
	let press: { from: number; y: number } | undefined;
	let slid = false;
	let onPill = false;

	const lit = () => (brightness() - MIN_BRIGHTNESS) / (1 - MIN_BRIGHTNESS);
	const percent = () => `${Math.round(brightness() * 100)}%`;

	const change = (level: number) => {
		const before = brightness();
		setBrightness(level);
		const now = brightness();
		if (now !== before && (now === 1 || now === MIN_BRIGHTNESS)) tick();
	};

	const close = () => {
		clearTimeout(closeTimer);
		setPinned(false);
		setOpen(false);
		props.onOpen(false);
	};
	const closeIn = (ms: number) => {
		clearTimeout(closeTimer);
		closeTimer = window.setTimeout(close, ms);
	};
	const show = (stay: boolean) => {
		clearTimeout(closeTimer);
		setPinned(stay);
		setOpen(true);
		props.onOpen(true);
		if (stay) closeIn(PINNED_MS);
	};
	onCleanup(() => clearTimeout(closeTimer));

	const setAt = (y: number) => {
		if (!pill) return;
		const rect = pill.getBoundingClientRect();
		change(1 - (y - rect.top) / rect.height);
	};

	return (
		<div class="relative">
			<div
				aria-label="Brightness"
				aria-valuemax={100}
				aria-valuemin={Math.round(MIN_BRIGHTNESS * 100)}
				aria-valuenow={Math.round(brightness() * 100)}
				class="rail-item rail-lamp flex cursor-pointer touch-none flex-col items-center gap-[3px]"
				onClick={() => {
					if (slid) return;
					if (pinned()) close();
					else show(true);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						if (pinned()) close();
						else show(true);
					} else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
						change(brightness() + (e.key === "ArrowUp" ? STEP : -STEP));
						show(true);
					} else return;
					e.preventDefault();
				}}
				onPointerCancel={() => {
					press = undefined;
					if (slid) closeIn(650);
				}}
				onPointerDown={(e) => {
					e.currentTarget.setPointerCapture(e.pointerId);
					press = { from: brightness(), y: e.clientY };
					slid = false;
				}}
				onPointerMove={(e) => {
					if (!press) return;
					const up = press.y - e.clientY;
					if (!slid && Math.abs(up) < 6) return;
					if (!slid) {
						slid = true;
						show(false);
					}
					change(press.from + (up / RANGE_PX) * (1 - MIN_BRIGHTNESS));
				}}
				onPointerUp={() => {
					press = undefined;
					if (!slid) return;
					closeIn(650);
					// The click that may follow a slide isn't a tap.
					setTimeout(() => {
						slid = false;
					});
				}}
				role="slider"
				style={{ "--rail-i": String(props.order) }}
				tabIndex={0}
			>
				<span class="rail-glyph flex h-10 w-10 items-center justify-center">
					<LampGlyph lit={lit()} size={27} />
				</span>
				<span class="rail-label font-semibold text-[10px] tabular-nums opacity-60">
					{brightness() === 1 ? "Dim" : percent()}
				</span>
			</div>

			<div
				class="rail-pill-box absolute right-[calc(100%+12px)] flex w-14 flex-col items-center gap-[7px]"
				data-open={open()}
				data-pinned={pinned()}
				style={{ bottom: "calc(50% - 66px)" }}
			>
				<span class="rail-label font-bold text-[12px] tabular-nums">
					{percent()}
				</span>
				<div
					class="rail-pill relative h-[216px] w-14 touch-none overflow-hidden rounded-full"
					onPointerDown={(e) => {
						e.currentTarget.setPointerCapture(e.pointerId);
						clearTimeout(closeTimer);
						onPill = true;
						setAt(e.clientY);
					}}
					onPointerMove={(e) => onPill && setAt(e.clientY)}
					onPointerUp={() => {
						onPill = false;
						closeIn(PINNED_MS);
					}}
					ref={pill}
				>
					<div
						class="absolute inset-x-0 bottom-0"
						style={{
							background: "color-mix(in oklab, currentColor 30%, transparent)",
							height: `${brightness() * 100}%`,
						}}
					/>
					<span class="absolute inset-x-0 bottom-[13px] flex justify-center">
						<LampGlyph lit={lit()} size={24} />
					</span>
				</div>
			</div>

			<Show when={pinned()}>
				<Portal>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: dismiss target, not a control */}
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: the lamp closes it from the keyboard */}
					<div class="fixed inset-0 z-[39]" onClick={close} />
				</Portal>
			</Show>
		</div>
	);
}
