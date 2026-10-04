import { type JSX, Show } from "solid-js";

/**
 * Where a prompt sits. The Feed's card runs along the top of the tab; from desktop up it gives way to the
 * sidebar's, which stacks the same words and button in the sidebar's width.
 */
export type PromptPlacement = "feed" | "sidebar";

const FRAME: Record<PromptPlacement, string> = {
	feed: "mb-5 px-4 tablet:px-0 desktop:hidden",
	sidebar: "hidden w-full desktop:block",
};

const CARD: Record<PromptPlacement, string> = {
	feed: "flex items-center gap-3.5 py-3.5 pr-3.5 pl-4",
	sidebar: "flex flex-col gap-3 p-3.5",
};

// A card that asks one thing of the reader: to install the app, or to update it.
export default function PromptCard(props: {
	title: string;
	desc: string;
	placement: PromptPlacement;
	children: JSX.Element;
}) {
	return (
		<div class={FRAME[props.placement]}>
			<div
				class={`rounded-2xl border border-border bg-surface ${CARD[props.placement]}`}
			>
				<Show when={props.placement === "feed"}>
					<img
						alt=""
						class="h-12 w-12 shrink-0 rounded-[14px]"
						height="48"
						src="/icons/pwa-192x192.png"
						width="48"
					/>
				</Show>
				<div class="min-w-0 flex-1">
					<div class="font-semibold text-[15px] text-ink">{props.title}</div>
					<div class="mt-0.5 text-[13px] text-ink-soft leading-snug">
						{props.desc}
					</div>
				</div>
				<div
					class="flex shrink-0 flex-col items-stretch gap-1"
					classList={{ "w-full": props.placement === "sidebar" }}
				>
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
