import { children, type JSX, Show } from "solid-js";

interface SectionHeaderProps {
	title: string;
	class?: string;
	children?: JSX.Element;
}

export default function SectionHeader(props: SectionHeaderProps) {
	const c = children(() => props.children);

	return (
		<div
			class={[
				"flex items-center justify-between py-3 px-5 pb-2 tablet:px-0",
				props.class,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<span class="text-base font-semibold text-ink">{props.title}</span>
			<Show when={c()}>
				<div class="text-sm text-brand-500 font-medium cursor-pointer">
					{c()}
				</div>
			</Show>
		</div>
	);
}
