import { Plus } from "phosphor-solid";
import { createEffect, createSignal, For, on, onCleanup } from "solid-js";
import { openAdd } from "../lib/add.ts";
import { TABS, type TabId } from "../lib/tabs.ts";
import { TAB_ICONS } from "./tab-icons.ts";

// Scrolled this far down a tab, the bar shrinks to the tab you're on.
const SHRINK_AFTER_PX = 48;

interface BottomNavProps {
	activeTab: TabId;
	setActiveTab: (tab: TabId) => void;
	scroller: () => HTMLElement | undefined;
}

// The tab bar of iOS 26's Liquid Glass: a glass capsule of icons over the content with a lozenge that springs
// to the tab you choose, and adding books in a glass circle of its own beside it. Scrolling down a tab shrinks the
// capsule to that tab alone, giving the screen back; scrolling up, or a tap, opens it again. Nothing here has a
// view-transition name: a name makes an element a backdrop root, so the blur sees nothing behind it, and
// during a transition its snapshot shows the blur as a hard rectangle. From tablet up the sidebar takes its place.
export default function BottomNav(props: BottomNavProps) {
	const [small, setSmall] = createSignal(false);
	const index = () => TABS.findIndex((tab) => tab.id === props.activeTab);
	let lozenge: HTMLSpanElement | undefined;

	createEffect(
		on(index, (_, previous) => {
			setSmall(false);
			if (previous === undefined) return;
			if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
			// It stretches on its way, as the glass does.
			lozenge?.animate(
				[{ scale: "1 1" }, { scale: "1.16 1", offset: 0.45 }, { scale: "1 1" }],
				{ duration: 420, easing: "ease-out" },
			);
		}),
	);

	createEffect(() => {
		const el = props.scroller();
		if (!el) return;
		let last = el.scrollTop;
		const onScroll = () => {
			const y = el.scrollTop;
			if (Math.abs(y - last) < 6) return;
			setSmall(y > last && y > SHRINK_AFTER_PX);
			last = y;
		};
		el.addEventListener("scroll", onScroll, { passive: true });
		onCleanup(() => el.removeEventListener("scroll", onScroll));
	});

	return (
		<nav
			class="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3.5 pb-[max(14px,env(safe-area-inset-bottom))] tablet:hidden"
			data-splash-slide
		>
			<div class="flex items-end justify-between gap-2.5">
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: the tabs inside are the controls; this only opens a shrunk bar */}
				{/* biome-ignore lint/a11y/noStaticElementInteractions: as above */}
				<div
					class="liquid-glass glass-bar pointer-events-auto relative h-[60px] w-full rounded-full p-1 transition-[max-width] duration-500 ease-spring"
					onClick={() => setSmall(false)}
					style={{ "max-width": small() ? "60px" : "calc(100% - 70px)" }}
				>
					<span
						class="absolute top-1 left-1 h-[52px] w-[calc((100%-8px)/4)] rounded-full bg-brand-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-[transform,opacity] duration-[420ms] ease-spring"
						classList={{ "opacity-0": small() }}
						ref={lozenge}
						style={{ transform: `translateX(${index() * 100}%)` }}
					/>
					<div class="relative grid h-full grid-cols-4">
						<For each={TABS}>
							{(tab, i) => {
								const active = () => i() === index();
								const Icon = TAB_ICONS[tab.id];
								return (
									<button
										aria-current={active() ? "page" : undefined}
										aria-label={tab.label}
										class="grid place-items-center rounded-full transition-[opacity,color] duration-200"
										classList={{
											"text-brand-500": active(),
											"text-ink-muted": !active(),
											"pointer-events-none opacity-0": small() && !active(),
											"absolute inset-0": small() && active(),
										}}
										onClick={() => props.setActiveTab(tab.id)}
										type="button"
									>
										<Icon aria-hidden="true" size={24} weight="fill" />
									</button>
								);
							}}
						</For>
					</div>
				</div>
				<button
					aria-label="Add books"
					class="liquid-glass glass-bar pointer-events-auto grid size-[60px] shrink-0 place-items-center rounded-full text-ink transition-transform active:scale-90"
					onClick={openAdd}
					type="button"
				>
					<Plus aria-hidden="true" size={24} weight="bold" />
				</button>
			</div>
		</nav>
	);
}
