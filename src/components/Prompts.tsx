import { Show } from "solid-js";
import { updateCard } from "../lib/update.ts";
import InstallCard from "./InstallCard.tsx";
import type { PromptPlacement } from "./PromptCard.tsx";
import UpdateCard from "./UpdateCard.tsx";

// The one thing the app is asking of you: an update takes the install card's place.
export default function Prompts(props: { placement: PromptPlacement }) {
	return (
		<Show
			fallback={<InstallCard placement={props.placement} />}
			when={updateCard()}
		>
			<UpdateCard placement={props.placement} />
		</Show>
	);
}
