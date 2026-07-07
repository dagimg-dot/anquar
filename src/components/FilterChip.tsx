import { mergeProps } from "solid-js";

interface FilterChipProps {
	label: string;
	active?: boolean;
	onClick?: () => void;
	class?: string;
}

export default function FilterChip(rawProps: FilterChipProps) {
	const props = mergeProps({ active: false }, rawProps);

	return (
		<button
			type="button"
			class={[
				"shrink-0 border px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 active:scale-90",
				props.active
					? "bg-brand-500 border-brand-500 text-white"
					: "bg-surface border-border text-ink-soft hover:border-brand-400 hover:text-brand-400",
				props.class,
			]
				.filter(Boolean)
				.join(" ")}
			onClick={props.onClick}
		>
			{props.label}
		</button>
	);
}
