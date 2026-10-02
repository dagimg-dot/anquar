import { MARK, markLines } from "../brand/mark";

export default function AppHeader() {
	return (
		<header class="flex items-center justify-between px-5 pt-4 pb-3 sticky top-0 z-20 bg-gradient-to-b from-canvas/100 via-canvas/100 to-transparent">
			<span class="flex items-center gap-2 text-[22px] font-extrabold tracking-tight">
				<svg
					class="w-[26px] h-[26px] text-brand-500 shrink-0"
					viewBox="0 0 64 64"
					fill="none"
					stroke="currentColor"
					stroke-width={MARK.stroke}
					stroke-linecap="round"
					aria-hidden="true"
					data-splash-land
				>
					{markLines().map((l) => (
						<line x1={l.x1} y1={l.y} x2={l.x2} y2={l.y} />
					))}
				</svg>
				<span
					class="bg-gradient-to-br from-ink to-ink-soft bg-clip-text text-transparent"
					data-splash-word
				>
					anquar
				</span>
			</span>
		</header>
	);
}
