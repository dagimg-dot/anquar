import { BookmarkSimple, Export, GearSix, Lightbulb } from "phosphor-solid";
import type { JSX } from "solid-js";
import { Show } from "solid-js";
import {
	getAccentColors,
	type RailRest,
	useReaderSettings,
} from "../lib/reader-settings.tsx";

/** 2π × 18.4, the radius the ring is drawn at. */
const RING = 115.6;

interface ReaderRailProps {
	coverUrl?: string;
	onContents: () => void;
	onExplain: () => void;
	onSave: () => void;
	onSettings: () => void;
	onShare: () => void;
	/** 0–1 through the whole book. */
	progress: number;
	rest: RailRest;
	saved: boolean;
	/** Toggled by a tap on the page; overrides the rest level while true. */
	shown: boolean;
}

function Item(props: {
	children: JSX.Element;
	label: string;
	onClick: () => void;
	order: number;
	style?: JSX.CSSProperties;
}) {
	return (
		<button
			aria-label={props.label}
			class="rail-item flex flex-col items-center gap-[3px]"
			onClick={props.onClick}
			style={{ ...props.style, "--rail-i": String(props.order) }}
			type="button"
		>
			{props.children}
			<span class="rail-label font-semibold text-[10px] opacity-60">
				{props.label}
			</span>
		</button>
	);
}

export default function ReaderRail(props: ReaderRailProps) {
	const { settings, themeColors } = useReaderSettings();
	const accents = () => getAccentColors(settings());

	let saveGlyph: HTMLSpanElement | undefined;
	let saveHalo: HTMLSpanElement | undefined;

	const reduceMotion = () =>
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	function flashSave() {
		if (reduceMotion()) return;
		for (const [el, cls] of [
			[saveGlyph, "rail-pop"],
			[saveHalo, "rail-halo"],
		] as const) {
			if (!el) continue;
			el.classList.remove(cls);
			void el.offsetWidth;
			el.classList.add(cls);
		}
	}

	return (
		<div
			class="rail fixed right-3 z-40 flex flex-col items-center gap-4"
			data-shown={props.shown}
			data-rest={props.rest}
			style={{
				bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)",
				color: themeColors().textColor,
				"--rail-halo": themeColors().bgColor,
			}}
		>
			<Item label="Contents" onClick={props.onContents} order={4}>
				<span class="rail-glyph relative block h-[42px] w-[42px]">
					{/* inset cannot size a replaced element — the img needs its own box. */}
					<span class="absolute inset-[5.5px] overflow-hidden rounded-full bg-gradient-to-br from-brand-400 to-brand-700">
						<Show when={props.coverUrl}>
							<img
								alt=""
								class="h-full w-full object-cover"
								src={props.coverUrl}
							/>
						</Show>
					</span>
					<svg
						aria-hidden="true"
						class="absolute inset-0 -rotate-90"
						viewBox="0 0 42 42"
					>
						<circle
							cx="21"
							cy="21"
							fill="none"
							opacity="0.22"
							r="18.4"
							stroke="currentColor"
							stroke-width="2.7"
						/>
						<circle
							cx="21"
							cy="21"
							fill="none"
							r="18.4"
							stroke="currentColor"
							stroke-dasharray={String(RING)}
							stroke-dashoffset={String(RING * (1 - props.progress))}
							stroke-linecap="round"
							stroke-width="2.7"
							style={{ transition: "stroke-dashoffset 200ms linear" }}
						/>
					</svg>
				</span>
			</Item>

			<Item label="Explain" onClick={props.onExplain} order={3}>
				<span class="rail-glyph flex h-10 w-10 items-center justify-center">
					<Lightbulb size={27} />
				</span>
			</Item>

			<Item
				label="Save"
				onClick={() => {
					if (!props.saved) flashSave();
					props.onSave();
				}}
				order={2}
				style={props.saved ? { color: accents().save } : undefined}
			>
				<span
					class="rail-glyph relative flex h-10 w-10 items-center justify-center"
					ref={saveGlyph}
				>
					<BookmarkSimple size={27} weight={props.saved ? "fill" : "regular"} />
					<span
						class="pointer-events-none absolute inset-0 m-auto h-10 w-10 rounded-full border-2 border-current opacity-0"
						ref={saveHalo}
					/>
				</span>
			</Item>

			<Item label="Share" onClick={props.onShare} order={1}>
				<span class="rail-glyph flex h-10 w-10 items-center justify-center">
					<Export size={27} />
				</span>
			</Item>

			<Item label="Settings" onClick={props.onSettings} order={0}>
				<span class="rail-glyph flex h-10 w-10 items-center justify-center">
					<GearSix size={27} />
				</span>
			</Item>
		</div>
	);
}
