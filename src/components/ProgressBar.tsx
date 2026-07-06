import { mergeProps } from "solid-js";

interface ProgressBarProps {
	percent?: number;
	class?: string;
}

export default function ProgressBar(rawProps: ProgressBarProps) {
	const props = mergeProps({ percent: 0 }, rawProps);

	return (
		<div
			class={["h-[3px] rounded-sm bg-black/10 overflow-hidden", props.class]
				.filter(Boolean)
				.join(" ")}
		>
			<div
				class="h-full rounded-sm bg-brand-500 transition-[width] duration-300"
				style={{ width: `${Math.min(100, Math.max(0, props.percent))}%` }}
			/>
		</div>
	);
}
