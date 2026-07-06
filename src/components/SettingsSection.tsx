import { type JSX, Show } from "solid-js";

interface SettingsSectionProps {
	title: string;
	children: JSX.Element;
}

export default function SettingsSection(props: SettingsSectionProps) {
	return (
		<div class="settings-section">
			<div class="settings-section-title">{props.title}</div>
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
		<div class="settings-row">
			<div class="settings-row-info">
				<div class="settings-row-label">{props.label}</div>
				<Show when={props.desc}>
					<div class="settings-row-desc">{props.desc}</div>
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
			class={`settings-option${props.active ? " active" : ""}`}
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
			class={`settings-option${props.active ? " active" : ""}`}
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
		<div class={`settings-options${props.class ? ` ${props.class}` : ""}`}>
			{props.children}
		</div>
	);
}
