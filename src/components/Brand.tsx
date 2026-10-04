import { MARK, markLines } from "../brand/mark";

interface BrandProps {
	class?: string;
	wordClass?: string;
}

// The mark and the wordmark, in the header and the sidebar. The splash lands its mark on whichever is on screen.
export default function Brand(props: BrandProps) {
	return (
		<span
			class={[
				"flex items-center gap-2 font-extrabold text-[22px] tracking-tight",
				props.class,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<svg
				aria-hidden="true"
				class="size-[26px] shrink-0 text-brand-500"
				data-splash-land
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-width={MARK.stroke}
				viewBox="0 0 64 64"
			>
				{markLines().map((l) => (
					<line x1={l.x1} x2={l.x2} y1={l.y} y2={l.y} />
				))}
			</svg>
			<span
				class={[
					"bg-gradient-to-br from-ink to-ink-soft bg-clip-text text-transparent",
					props.wordClass,
				]
					.filter(Boolean)
					.join(" ")}
				data-splash-word
			>
				anquar
			</span>
		</span>
	);
}
