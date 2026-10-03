import type { JSX } from "solid-js";

// A card at the top of the Feed tab that asks one thing of the reader: to install the app, or to update it.
export default function PromptCard(props: {
	title: string;
	desc: string;
	children: JSX.Element;
}) {
	return (
		<div class="mb-5 px-4">
			<div class="flex items-center gap-3.5 rounded-2xl border border-border bg-surface py-3.5 pr-3.5 pl-4">
				<img
					alt=""
					class="h-12 w-12 shrink-0 rounded-[14px]"
					height="48"
					src="/icons/pwa-192x192.png"
					width="48"
				/>
				<div class="min-w-0 flex-1">
					<div class="font-semibold text-[15px] text-ink">{props.title}</div>
					<div class="mt-0.5 text-[13px] text-ink-soft leading-snug">
						{props.desc}
					</div>
				</div>
				<div class="flex shrink-0 flex-col items-stretch gap-1">
					{props.children}
				</div>
			</div>
		</div>
	);
}

export function PromptAction(props: { label: string; onClick: () => void }) {
	return (
		<button
			class="rounded-full bg-brand-500 px-4 py-2 font-semibold text-[13.5px] text-canvas transition-transform active:scale-95"
			onClick={props.onClick}
			type="button"
		>
			{props.label}
		</button>
	);
}
