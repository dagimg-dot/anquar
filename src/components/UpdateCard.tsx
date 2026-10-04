import { Match, Switch } from "solid-js";
import {
	incoming,
	openWhatsNew,
	unseen,
	update,
	updateCard,
} from "../lib/update.ts";
import PromptCard, {
	PromptAction,
	type PromptPlacement,
} from "./PromptCard.tsx";

// An update to take, or the notes of one taken by closing the app. It stays until it's answered: no Not now.
export default function UpdateCard(props: { placement: PromptPlacement }) {
	return (
		<Switch>
			<Match when={updateCard() === "ready"}>
				<PromptCard
					desc={incoming()?.title ?? "Fixes and small improvements."}
					placement={props.placement}
					title="Update anquar"
				>
					<PromptAction label="Update" onClick={update} />
				</PromptCard>
			</Match>
			<Match when={updateCard() === "updated"}>
				<PromptCard
					desc={unseen()[0]?.title ?? ""}
					placement={props.placement}
					title="anquar updated"
				>
					<PromptAction label="What's new" onClick={openWhatsNew} />
				</PromptCard>
			</Match>
		</Switch>
	);
}
