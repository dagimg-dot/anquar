import { MARK, markLines } from "../brand/mark";
import IconButton from "./IconButton";

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
				>
					{markLines().map((l) => (
						<line x1={l.x1} y1={l.y} x2={l.x2} y2={l.y} />
					))}
				</svg>
				<span class="bg-gradient-to-br from-ink to-ink-soft bg-clip-text text-transparent">
					anquar
				</span>
			</span>
			<IconButton size="sm" shape="round" ariaLabel="Profile">
				<svg
					class="w-[18px] h-[18px]"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="12" cy="8" r="4" />
					<path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
				</svg>
			</IconButton>
		</header>
	);
}
