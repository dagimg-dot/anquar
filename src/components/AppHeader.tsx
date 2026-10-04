import Brand from "./Brand";
import { HeaderSlot } from "./HeaderTools";

// On a phone the header is the brand. From tablet up the sidebar carries the brand and the header names the
// tab, with that tab's own controls at its right end (HeaderTools).
export default function AppHeader(props: { title: string }) {
	return (
		<header class="glass-mask sticky top-0 z-20 bg-canvas/80 backdrop-blur-xl">
			<div class="page-column flex items-center justify-between px-5 pt-4 pb-5 tablet:h-[84px] tablet:py-0">
				<Brand class="tablet:hidden" />
				<h1 class="hidden font-extrabold text-[28px] tracking-[-0.03em] tablet:block">
					{props.title}
				</h1>
				<HeaderSlot />
			</div>
		</header>
	);
}
