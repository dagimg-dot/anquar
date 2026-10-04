import type { JSX } from "solid-js";

interface CoverGridProps {
	children: JSX.Element;
	class?: string;
}

// Three covers across on a phone; from tablet up as many as fit the column.
export default function CoverGrid(props: CoverGridProps) {
	return (
		<div
			class={[
				"grid grid-cols-3 items-start gap-4 px-5 tablet:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] tablet:gap-x-5.5 tablet:gap-y-7 tablet:px-0",
				props.class,
			]
				.filter(Boolean)
				.join(" ")}
		>
			{props.children}
		</div>
	);
}
