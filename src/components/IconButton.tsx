import { type JSX, mergeProps, splitProps } from "solid-js";

interface IconButtonProps {
	children: JSX.Element;
	class?: string;
	onClick?: () => void;
	ariaLabel?: string;
	size?: "sm" | "md";
	shape?: "round" | "square";
	classList?: Record<string, boolean | undefined>;
}

export default function IconButton(rawProps: IconButtonProps) {
	const props = mergeProps(
		{ size: "md" as const, shape: "square" as const },
		rawProps,
	);
	const [local, others] = splitProps(props, [
		"children",
		"class",
		"onClick",
		"ariaLabel",
		"size",
		"shape",
	]);

	return (
		<button
			type="button"
			class={`bg-surface border border-border cursor-pointer flex items-center justify-center transition-all duration-300 active:scale-90 shrink-0 ${local.size === "sm" ? "w-9 h-9" : "w-10 h-10"} ${local.shape === "round" ? "rounded-full" : "rounded-xl"} ${local.class ?? ""}`}
			classList={{ "text-ink-muted": true, ...rawProps.classList }}
			onClick={local.onClick}
			aria-label={local.ariaLabel}
			{...others}
		>
			{local.children}
		</button>
	);
}

export function EmptyState(props: { children: JSX.Element; class?: string }) {
	return (
		<div
			class={`text-center py-12 px-5 text-ink-soft text-sm ${props.class ?? ""}`}
		>
			{props.children}
		</div>
	);
}

export function EmptyStateIcon(props: { children: JSX.Element }) {
	return (
		<div class="w-14 h-14 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
			{props.children}
		</div>
	);
}

export function EmptyStateTitle(props: { children: JSX.Element }) {
	return (
		<div class="text-lg font-semibold text-ink mb-1">{props.children}</div>
	);
}
