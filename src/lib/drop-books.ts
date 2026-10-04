import { createSignal, onCleanup, onMount } from "solid-js";
import { closeAdd } from "./add";
import { importFiles } from "./imports";

const [dropping, setDropping] = createSignal(false);

/** Files are being dragged over the window, so it can say where they will land. */
export { dropping };

const carriesFiles = (e: DragEvent) =>
	e.dataTransfer?.types.includes("Files") ?? false;

// A book dropped anywhere on the window goes through the same queue as one picked from the Add sheet. Every
// file drag is answered, or the browser would open the dropped file in place of the app.
export function useDropBooks() {
	onMount(() => {
		let depth = 0;
		const end = () => {
			depth = 0;
			setDropping(false);
		};
		const enter = (e: DragEvent) => {
			if (!carriesFiles(e)) return;
			depth += 1;
			setDropping(true);
		};
		const over = (e: DragEvent) => {
			if (carriesFiles(e)) e.preventDefault();
		};
		const leave = (e: DragEvent) => {
			if (!carriesFiles(e)) return;
			depth = Math.max(0, depth - 1);
			if (depth === 0) setDropping(false);
		};
		const drop = (e: DragEvent) => {
			if (!carriesFiles(e)) return;
			e.preventDefault();
			end();
			closeAdd();
			importFiles([...(e.dataTransfer?.files ?? [])]);
		};

		const on = { dragenter: enter, dragover: over, dragleave: leave, drop };
		for (const [type, handler] of Object.entries(on))
			document.addEventListener(type, handler as EventListener);
		onCleanup(() => {
			for (const [type, handler] of Object.entries(on))
				document.removeEventListener(type, handler as EventListener);
			end();
		});
	});
}
