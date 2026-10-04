import { MagnifyingGlass } from "phosphor-solid";
import { onCleanup, Show } from "solid-js";
import { registerSearch } from "../lib/shell-keys";

interface SearchBoxProps {
	onInput: (value: string) => void;
	value: string;
}

export default function SearchBox(props: SearchBoxProps) {
	return (
		<label class="relative block flex-1 tablet:w-72 tablet:flex-none">
			<MagnifyingGlass
				aria-hidden="true"
				class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
				size={18}
			/>
			<input
				class="w-full rounded-xl border border-border bg-surface-elevated py-3 pr-4 pl-11 text-ink text-sm outline-none transition-colors duration-200 placeholder:text-ink-muted focus:border-brand-500 tablet:py-2.5 tablet:pr-11"
				onInput={(e) => props.onInput(e.currentTarget.value)}
				placeholder="Search your library…"
				ref={(el) => {
					registerSearch(el);
					onCleanup(() => registerSearch(undefined));
				}}
				type="search"
				value={props.value}
			/>
			{/* Gone once there is text, where the field's own clear button takes the spot. */}
			<Show when={!props.value}>
				<kbd class="absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 font-semibold text-[11px] text-ink-muted tablet:block">
					/
				</kbd>
			</Show>
		</label>
	);
}
