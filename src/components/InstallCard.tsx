import { Show } from "solid-js";
import { install, installLater, suggestInstall } from "../lib/install.ts";
import PromptCard, {
	PromptAction,
	type PromptPlacement,
} from "./PromptCard.tsx";

// Opened in Chrome rather than installed: one card says what installing gives you.
export default function InstallCard(props: { placement: PromptPlacement }) {
	return (
		<Show when={suggestInstall()}>
			<PromptCard
				desc="Opens full screen, reads offline, and takes EPUBs from your share sheet."
				placement={props.placement}
				title="Install anquar"
			>
				<PromptAction label="Install" onClick={() => void install()} />
				<button
					class="py-1 font-medium text-[12.5px] text-ink-muted"
					onClick={installLater}
					type="button"
				>
					Not now
				</button>
			</PromptCard>
		</Show>
	);
}
