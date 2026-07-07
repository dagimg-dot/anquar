import { type JSX, Show } from "solid-js";

interface SettingsSectionProps {
	title: string;
	children: JSX.Element;
}

export default function SettingsSection(props: SettingsSectionProps) {
	return (
		<div class="px-5 mb-7">
			<div class="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-3">
				{props.title}
			</div>
			{props.children}
		</div>
	);
}

export function SettingsRowInfo(props: {
	label: string;
	desc?: string;
	children?: JSX.Element;
}) {
	return (
		<div class="flex items-center justify-between mb-2.5">
			<div class="min-w-0">
				<div class="text-[15px] font-medium">{props.label}</div>
				<Show when={props.desc}>
					<div class="text-xs text-ink-muted mt-px">{props.desc}</div>
				</Show>
			</div>
			{props.children}
		</div>
	);
}

interface SettingsOptionProps {
	label: string;
	active?: boolean;
	onClick?: () => void;
}

export function SettingsOption(props: SettingsOptionProps) {
	return (
		<button
			type="button"
			class={`flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl bg-surface border text-sm font-medium cursor-pointer transition-all duration-300 active:scale-95 hover:border-border-light ${
				props.active
					? "!bg-brand-500/12 !border-brand-500 !text-brand-500"
					: "border-border text-ink-soft"
			}`}
			onClick={props.onClick}
		>
			{props.label}
		</button>
	);
}

interface SettingsThemeOptionProps {
	label: string;
	active?: boolean;
	onClick?: () => void;
	children: JSX.Element;
}

export function SettingsThemeOption(props: SettingsThemeOptionProps) {
	return (
		<button
			type="button"
			class={`flex-1 flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-surface border text-sm font-medium cursor-pointer transition-all duration-300 active:scale-95 hover:border-border-light ${
				props.active
					? "!bg-brand-500/12 !border-brand-500 !text-brand-500"
					: "border-border text-ink-soft"
			}`}
			onClick={props.onClick}
		>
			{props.children}
			{props.label}
		</button>
	);
}

export function SettingsOptionGroup(props: {
	children: JSX.Element;
	class?: string;
}) {
	return (
		<div class={`flex gap-2${props.class ? ` ${props.class}` : ""}`}>
			{props.children}
		</div>
	);
}
