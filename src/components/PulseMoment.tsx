import { createEffect, createSignal, For, on, onCleanup } from "solid-js";
import { GROUND, INK, markLines } from "../brand/mark";
import type { Moment } from "../lib/reading";

const SHOWN_MS = 2200;
const LEAVE_MS = 400;

// A pill that drops in above the page when a reading threshold is crossed, then leaves on its own. It is
// the app's dark surface in every reader theme, and its mark is the Reading Pulse meter, full.
export default function PulseMoment(props: {
	moment: Moment | undefined;
	onDone: () => void;
}) {
	const [shown, setShown] = createSignal(false);
	let timers: ReturnType<typeof setTimeout>[] = [];
	const clear = () => {
		for (const t of timers) clearTimeout(t);
		timers = [];
	};

	createEffect(
		on(
			() => props.moment,
			(moment) => {
				clear();
				if (!moment) return;
				try {
					navigator.vibrate?.(12);
				} catch {}
				requestAnimationFrame(() => setShown(true));
				timers.push(
					setTimeout(() => setShown(false), SHOWN_MS),
					setTimeout(props.onDone, SHOWN_MS + LEAVE_MS),
				);
			},
		),
	);
	onCleanup(clear);

	return (
		<div
			aria-live="polite"
			class="pulse-moment pointer-events-none fixed top-0 left-1/2 z-50 flex items-center gap-2.5 whitespace-nowrap rounded-full py-2 pr-4 pl-2 font-semibold text-[13.5px] shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
			data-shown={shown()}
			style={{ background: GROUND, color: "#EAF1ED" }}
		>
			<span class="grid size-7 place-items-center rounded-[9px] bg-[rgba(72,222,129,0.14)]">
				<svg
					aria-hidden="true"
					class="size-5"
					fill="none"
					stroke={INK}
					stroke-linecap="round"
					stroke-width="4"
					viewBox="0 0 64 64"
				>
					<For each={markLines()}>
						{(l) => <line x1={l.x1} x2={l.x2} y1={l.y} y2={l.y} />}
					</For>
				</svg>
			</span>
			<span>
				{props.moment?.text}
				<span class="ml-1 font-medium text-[#8FA096]">
					· {props.moment?.detail}
				</span>
			</span>
		</div>
	);
}
