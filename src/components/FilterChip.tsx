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
				"px-3.5 py-1.5 rounded-full text-sm font-medium bg-transparent text-ink-soft cursor-pointer transition-all duration-200 hover:border-brand-500 hover:text-brand-500",
				props.active
					? "bg-brand-500/12 border-brand-500 text-brand-500"
					: "border-border",
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
