interface HighlightCardProps {
	text: string;
	meta: string;
	accentColor?: string;
	class?: string;
}

export default function HighlightCard(props: HighlightCardProps) {
	return (
		<div class={["flex gap-3 py-3", props.class].filter(Boolean).join(" ")}>
			<div
				class="w-[3px] shrink-0 rounded-sm"
				style={{ background: props.accentColor || "var(--color-brand-500)" }}
			/>
			<div class="min-w-0">
				<div class="text-sm italic text-ink leading-relaxed">{props.text}</div>
				<div class="text-xs text-ink-soft mt-1">{props.meta}</div>
			</div>
		</div>
	);
}
