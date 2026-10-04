import { Plus } from "phosphor-solid";
import { For } from "solid-js";
import { openAdd } from "../lib/add";
import { TABS, type TabId } from "../lib/tabs";
import Brand from "./Brand";
import Prompts from "./Prompts";
import { TAB_ICONS } from "./tab-icons";

interface SidebarProps {
	activeTab: TabId;
	onSelect: (tab: TabId) => void;
}

// The bottom bar's place on a wide screen: an icon rail from tablet, opening into labels and the update or
// install prompt from desktop. The tabs and Add books are the same ones, from the same list.
export default function Sidebar(props: SidebarProps) {
	return (
		<aside class="sticky top-0 hidden h-dvh flex-col items-center border-border border-r px-3 pt-5 pb-4 tablet:flex desktop:items-stretch">
			<Brand class="pb-6 desktop:px-2.5" wordClass="hidden desktop:inline" />

			<nav
				aria-label="Main"
				class="grid gap-1 desktop:w-full"
				data-splash-rise="children"
			>
				<For each={TABS}>
					{(tab, i) => {
						const active = () => tab.id === props.activeTab;
						const Icon = TAB_ICONS[tab.id];
						return (
							<button
								aria-current={active() ? "page" : undefined}
								aria-label={tab.label}
								class="group flex h-11 w-[52px] items-center justify-center gap-3.5 rounded-xl font-semibold transition-colors desktop:w-full desktop:justify-start desktop:px-3"
								classList={{
									"bg-brand-500/15 text-brand-500": active(),
									"text-ink-soft hover:bg-surface hover:text-ink": !active(),
								}}
								onClick={() => props.onSelect(tab.id)}
								title={tab.label}
								type="button"
							>
								<Icon aria-hidden="true" size={22} weight="fill" />
								<span class="hidden desktop:inline">{tab.label}</span>
								<kbd class="ml-auto hidden rounded-md border border-border bg-surface px-1.5 py-0.5 font-semibold text-[11px] text-ink-muted opacity-0 transition-opacity group-hover:opacity-100 desktop:block">
									{i() + 1}
								</kbd>
							</button>
						);
					}}
				</For>
			</nav>

			<div class="mt-auto flex w-full flex-col items-center gap-3">
				<Prompts placement="sidebar" />
				<button
					aria-label="Add books"
					class="flex h-[46px] w-[52px] items-center justify-center gap-2.5 rounded-2xl border border-border bg-surface-elevated font-bold transition-colors hover:border-brand-500 desktop:w-full"
					onClick={openAdd}
					type="button"
				>
					<Plus
						aria-hidden="true"
						class="text-brand-500"
						size={18}
						weight="bold"
					/>
					<span class="hidden desktop:inline">Add books</span>
				</button>
			</div>
		</aside>
	);
}
