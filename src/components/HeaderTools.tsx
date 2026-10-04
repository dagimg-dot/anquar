import { createSignal, type JSX, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { isTablet } from "../lib/layout";

const [slot, setSlot] = createSignal<HTMLElement>();

/** The right end of the page header, where a tab's controls go on a wide screen. */
export function HeaderSlot() {
	return <div class="flex items-center gap-2.5" ref={setSlot} />;
}

/**
 * Controls that belong to a tab's page. On a phone they stay where they are written; from tablet up they move
 * into the header, which is no longer taken by the brand.
 */
export default function HeaderTools(props: { children: JSX.Element }) {
	return (
		<Show fallback={props.children} when={isTablet() && slot()}>
			{(target) => <Portal mount={target()}>{props.children}</Portal>}
		</Show>
	);
}
