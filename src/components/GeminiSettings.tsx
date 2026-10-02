import { Eye, EyeSlash } from "phosphor-solid";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import {
	CONNECT_MESSAGES,
	type ConnectError,
	ConnectFailure,
	connect,
	type GeminiModel,
	geminiKey,
	geminiModel,
	setGeminiKey,
	setGeminiModel,
} from "../lib/gemini.ts";
import IconButton from "./IconButton";
import SettingsSection, { SettingsRowInfo } from "./SettingsSection";

type Status = "none" | "checking" | "connected" | ConnectError;

const PILL: Record<Status, string> = {
	none: "No key",
	checking: "Checking",
	connected: "Connected",
	refused: "Key refused",
	offline: "Offline",
	failed: "Not checked",
};

// A pasted key is checked once typing stops, so there is nothing to press.
const SETTLE_MS = 600;

/**
 * Explain's key and model. A key is checked by asking Google which models it
 * can use, and that list, rather than one written here, is what the model picker
 * offers, so it never names a model Google has retired.
 */
export default function GeminiSettings() {
	const [key, setKey] = createSignal(geminiKey());
	const [shown, setShown] = createSignal(false);
	const [status, setStatus] = createSignal<Status>(key() ? "checking" : "none");
	const [models, setModels] = createSignal<GeminiModel[]>([]);
	const [model, setModel] = createSignal(geminiModel());

	let latest = 0;
	async function check(value: string) {
		const run = ++latest;
		setStatus("checking");
		try {
			const list = await connect(value);
			if (run !== latest) return;
			setModels(list);
			setModel(geminiModel());
			setStatus("connected");
		} catch (error) {
			if (run !== latest) return;
			setStatus(error instanceof ConnectFailure ? error.kind : "failed");
		}
	}

	onMount(() => {
		if (key()) void check(key());
	});

	let settle: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(settle));
	function type(value: string) {
		setKey(value);
		clearTimeout(settle);
		latest++;
		if (!value.trim()) {
			setGeminiKey("");
			setModels([]);
			setStatus("none");
			return;
		}
		setStatus("checking");
		settle = setTimeout(() => void check(value), SETTLE_MS);
	}

	function choose(id: string) {
		setModel(id);
		setGeminiModel(id);
	}

	return (
		<SettingsSection title="Explain">
			<SettingsRowInfo
				desc="Stays on this phone, used only when you ask"
				label="Gemini key"
			>
				<span
					class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-[12px]"
					classList={{
						"bg-brand-500/12 text-brand-500": status() === "connected",
						"bg-surface text-ink-muted":
							status() === "none" || status() === "checking",
						"bg-flame/12 text-flame":
							status() === "refused" ||
							status() === "offline" ||
							status() === "failed",
					}}
				>
					<span
						class="size-1.5 rounded-full bg-current"
						classList={{ "animate-pulse": status() === "checking" }}
					/>
					{PILL[status()]}
				</span>
			</SettingsRowInfo>
			<div class="flex gap-2">
				<input
					aria-label="Gemini key"
					autocomplete="off"
					class="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 py-2.5 font-mono text-ink text-sm outline-none transition-colors duration-200 placeholder:text-ink-muted focus:border-brand-500"
					onInput={(e) => type(e.currentTarget.value)}
					placeholder="Paste your key"
					spellcheck={false}
					type={shown() ? "text" : "password"}
					value={key()}
				/>
				<IconButton
					ariaLabel={shown() ? "Hide key" : "Show key"}
					classList={{ "!text-brand-500 !border-brand-500": shown() }}
					onClick={() => setShown(!shown())}
				>
					<Show fallback={<Eye size={18} />} when={shown()}>
						<EyeSlash size={18} />
					</Show>
				</IconButton>
			</div>
			<div class="mt-2 flex min-h-8 items-center justify-between gap-3 text-[13px]">
				<Show
					fallback={
						<a
							class="font-semibold text-brand-500"
							href="https://aistudio.google.com/apikey"
							rel="noreferrer"
							target="_blank"
						>
							Get a free key from Google AI Studio
						</a>
					}
					when={
						status() === "refused" ||
						status() === "offline" ||
						status() === "failed"
					}
				>
					<span class="text-ink-soft">
						{CONNECT_MESSAGES[status() as ConnectError]}
					</span>
					<button
						class="shrink-0 py-1 font-semibold text-brand-500"
						onClick={() => void check(key())}
						type="button"
					>
						Try again
					</button>
				</Show>
			</div>

			<div class="mt-3">
				<SettingsRowInfo
					desc={
						status() === "connected"
							? `${models().length} models for this key. Flash ones answer fastest.`
							: "Choose once your key is connected"
					}
					label="Model"
				/>
			</div>
			<select
				class="w-full cursor-pointer appearance-none rounded-xl border border-border bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2024%2024%27%20fill%3D%27none%27%20stroke%3D%27%23666%27%20stroke-width%3D%272%27%3E%3Cpath%20d%3D%27m6%209%206%206%206-6%27%2F%3E%3C%2Fsvg%3E')] bg-[right_12px_center] bg-no-repeat bg-surface px-3.5 py-2.5 text-ink text-sm outline-none transition-[colors,opacity] duration-200 focus:border-brand-500 disabled:opacity-50"
				disabled={status() !== "connected"}
				onChange={(e) => choose(e.currentTarget.value)}
				value={model()}
			>
				<Show
					fallback={<option value={model()}>{model()}</option>}
					when={models().length > 0}
				>
					<For each={models()}>
						{(m) => <option value={m.id}>{m.name}</option>}
					</For>
				</Show>
			</select>
		</SettingsSection>
	);
}
