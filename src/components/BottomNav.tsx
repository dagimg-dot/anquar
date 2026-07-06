import { Bookmark, BookOpen, Books, GearSix } from "phosphor-solid";
import { createSignal, onCleanup, onMount } from "solid-js";
import { useTheme } from "../theme/ThemeContext.tsx";

const NAV_ITEMS = [
	{ label: "Feed", icon: BookOpen },
	{ label: "Library", icon: Books },
	{ label: "Saved", icon: Bookmark },
	{ label: "Settings", icon: GearSix },
] as const;

interface BottomNavProps {
	activeTab: string;
	setActiveTab: (tab: string) => void;
}

export default function BottomNav(props: BottomNavProps) {
	useTheme();
	const [scrolled, setScrolled] = createSignal(false);

	onMount(() => {
		function onScroll() {
			setScrolled(window.scrollY > 50);
		}
		window.addEventListener("scroll", onScroll, { passive: true });
		onCleanup(() => window.removeEventListener("scroll", onScroll));
	});

	return (
		<nav class="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
			<div
				class={[
					"liquid-glass glass-nav",
					"relative mx-2 mb-2 rounded-2xl",
				].join(" ")}
				data-scrolled={scrolled()}
			>
				<div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />

				<div class="relative z-10 flex items-center justify-around px-2 py-1">
					{NAV_ITEMS.map((item) => (
						<button
							class="flex flex-col items-center gap-0.5 rounded-xl px-4 py-2 transition-colors"
							classList={{
								"text-brand-500": props.activeTab === item.label.toLowerCase(),
								"text-ink-soft hover:text-brand-400":
									props.activeTab !== item.label.toLowerCase(),
							}}
							onClick={() => props.setActiveTab(item.label.toLowerCase())}
							type="button"
						>
							<item.icon aria-hidden="true" size={24} />
							<span class="font-medium text-[10px]">{item.label}</span>
						</button>
					))}
				</div>
			</div>
		</nav>
	);
}
