import { For, Show } from "solid-js";
import { lineAt, MARK } from "../brand/mark";

// The mark as a meter: each line is a quarter of the way, filled from the core outwards, so the first
// quarter is the shortest line. Full, it is the mark itself.
export default function MarkMeter(props: {
	fill: number;
	class?: string;
	stroke?: number;
	rest?: boolean;
}) {
	const half = (d: number) => (MARK.halfTop / MARK.lines) * d;
	const part = (d: number) =>
		Math.min(1, Math.max(0, 4 * props.fill - (d - 1)));

	return (
		<svg
			aria-hidden="true"
			class={props.class}
			fill="none"
			overflow="visible"
			stroke-linecap="round"
			stroke-width={props.stroke ?? MARK.stroke}
			viewBox="0 0 64 64"
		>
			<For each={[1, 2, 3, 4]}>
				{(d) => {
					const { x1, x2, y } = lineAt(d);
					return (
						<>
							<line
								class={props.rest ? "stroke-ice/25" : "stroke-ink/15"}
								x1={x1}
								x2={x2}
								y1={y}
								y2={y}
							/>
							<Show when={part(d) > 0}>
								<line
									class={props.rest ? "stroke-ice" : "stroke-brand-500"}
									x1={MARK.cx - half(d) * part(d)}
									x2={MARK.cx + half(d) * part(d)}
									y1={y}
									y2={y}
								/>
							</Show>
						</>
					);
				}}
			</For>
		</svg>
	);
}
