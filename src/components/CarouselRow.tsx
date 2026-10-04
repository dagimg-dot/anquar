import type { JSX } from "solid-js";

interface CarouselRowProps {
	children: JSX.Element;
	class?: string;
}

const carouselRowStyle = `.carousel-row > * { flex: 0 0 auto; scroll-snap-align: start; }`;

export default function CarouselRow(props: CarouselRowProps) {
	return (
		<div
			class={[
				"carousel-row",
				"flex items-start gap-3 overflow-x-auto pb-2 px-5 tablet:flex-wrap tablet:gap-x-[18px] tablet:gap-y-6 tablet:overflow-visible tablet:px-0",
				props.class,
			]
				.filter(Boolean)
				.join(" ")}
			style="scroll-snap-type: x proximity; scroll-padding-left: 20px;"
		>
			<style>{carouselRowStyle}</style>
			{props.children}
		</div>
	);
}
