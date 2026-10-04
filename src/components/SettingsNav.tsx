import { For } from "solid-js";
import { sectionId } from "./SettingsSection";

// The sections of the Settings tab, in order, so that on a desktop they can be reached from the left.
const SECTIONS = ["App", "Appearance", "Reader", "Reading", "Explain", "Data"];

export default function SettingsNav() {
	return (
		<nav
			aria-label="Settings sections"
			class="sticky top-24 hidden gap-0.5 self-start desktop:col-start-1 desktop:row-span-7 desktop:row-start-1 desktop:grid"
		>
			<For each={SECTIONS}>
				{(title) => (
					<button
						class="cursor-pointer rounded-[10px] px-3 py-2 text-left font-semibold text-ink-soft text-sm transition-colors hover:bg-surface hover:text-ink"
						onClick={() =>
							document
								.getElementById(sectionId(title))
								?.scrollIntoView({ behavior: "smooth", block: "start" })
						}
						type="button"
					>
						{title}
					</button>
				)}
			</For>
		</nav>
	);
}
