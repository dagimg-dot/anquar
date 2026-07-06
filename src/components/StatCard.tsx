interface StatCardProps {
	value: string | number;
	label: string;
	class?: string;
}

export default function StatCard(props: StatCardProps) {
	return (
		<div
			class={[
				"flex-1 py-3 px-2 text-center rounded-xl bg-surface border border-border",
				props.class,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<div class="text-xl font-bold text-ink tabular-nums">{props.value}</div>
			<div class="text-xs text-ink-soft mt-0.5">{props.label}</div>
		</div>
	);
}
