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
					stroke-width="4"
					stroke-linecap="round"
					aria-hidden="true"
				>
					<line x1="8" y1="16" x2="56" y2="16" />
					<line x1="14" y1="28" x2="50" y2="28" />
					<line x1="20" y1="40" x2="44" y2="40" />
					<line x1="26" y1="52" x2="38" y2="52" />
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
