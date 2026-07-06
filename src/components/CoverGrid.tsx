import { type JSX, mergeProps } from "solid-js";

interface CoverGridProps {
	children: JSX.Element;
	columns?: number;
	class?: string;
}

export default function CoverGrid(rawProps: CoverGridProps) {
	const props = mergeProps({ columns: 3 }, rawProps);

	return (
		<div
			class={["grid gap-4 px-5", props.class].filter(Boolean).join(" ")}
			style={{ "grid-template-columns": `repeat(${props.columns}, 1fr)` }}
		>
			{props.children}
		</div>
	);
}
