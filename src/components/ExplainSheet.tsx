import { createResource, Match, Show, Switch } from "solid-js";
import { ExplainFailure, explainPassage } from "../lib/explain.ts";
import { getAccentColors, useReaderSettings } from "../lib/reader-settings.tsx";

interface ExplainSheetProps {
	author: string;
	/** "" when the reader had nothing selected and the whole card was sent. */
	selection: string;
	passage: string;
	title: string;
}

const MESSAGES: Record<string, string> = {
	"no-key": "Add a Gemini key in Settings → API key to use Explain.",
	"unsupported-model":
		"Explain currently speaks to Gemini only. Pick a Gemini model in Settings.",
	failed: "That request did not come back. Check your key and try again.",
};

export default function ExplainSheet(props: ExplainSheetProps) {
	const { settings } = useReaderSettings();
	const accent = () => getAccentColors(settings()).ai;

	const [answer] = createResource(
		() => props.passage,
		(passage) =>
			explainPassage(passage, { title: props.title, author: props.author }),
	);

	return (
		<div class="pb-2">
			<span
				class="inline-flex rounded-lg px-2.5 py-1.5 font-bold text-[11px] uppercase tracking-[0.06em]"
				style={{
					background: `color-mix(in oklab, ${accent()} 15%, transparent)`,
					color: accent(),
				}}
			>
				{props.selection ? "Selection" : "Whole card"}
			</span>

			<blockquote
				class="mt-3 max-h-[26dvh] overflow-y-auto rounded-xl bg-surface px-4 py-3 text-[15px] text-ink leading-relaxed"
				style={{ "border-left": `2.5px solid ${accent()}` }}
			>
				{props.passage}
			</blockquote>

			<div class="mt-4 text-[15px] text-ink leading-relaxed">
				<Switch>
					<Match when={answer.loading}>
						<div
							aria-label="Thinking"
							class="flex flex-col gap-2.5"
							role="status"
						>
							<div class="h-3 animate-pulse rounded bg-surface-elevated" />
							<div class="h-3 w-[92%] animate-pulse rounded bg-surface-elevated" />
							<div class="h-3 w-[78%] animate-pulse rounded bg-surface-elevated" />
						</div>
					</Match>
					<Match when={answer.error}>
						<p class="text-ink-soft">
							{MESSAGES[
								answer.error instanceof ExplainFailure
									? answer.error.kind
									: "failed"
							] ?? MESSAGES.failed}
						</p>
					</Match>
					<Match when={answer()}>
						<p class="whitespace-pre-wrap">{answer()}</p>
					</Match>
				</Switch>
			</div>

			<Show when={!answer.loading}>
				<p class="mt-4 text-[12.5px] text-ink-muted leading-normal">
					Only the passage above left this device.
				</p>
			</Show>
		</div>
	);
}
