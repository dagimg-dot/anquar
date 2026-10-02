import { createSignal, Show } from "solid-js";
import { dumpLibrary, restoreLibrary } from "../lib/db";
import {
	LibraryFileError,
	libraryFileName,
	packLibrary,
	unpackLibrary,
} from "../lib/library-file";
import { SettingsRowInfo } from "./SettingsSection";

const BUTTON =
	"min-w-[5.5rem] shrink-0 cursor-pointer rounded-xl border px-4 py-2 text-center font-semibold text-sm tabular-nums transition-transform duration-200 active:scale-95 disabled:cursor-default disabled:opacity-60";
const PLAIN = `${BUTTON} border-border bg-surface`;

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export default function LibraryData() {
	const [packed, setPacked] = createSignal<number>();
	const [restoring, setRestoring] = createSignal(false);
	const [problem, setProblem] = createSignal("");
	let picker: HTMLInputElement | undefined;

	async function exportLibrary() {
		setProblem("");
		setPacked(0);
		try {
			const file = await packLibrary(await dumpLibrary(), (percent) =>
				setPacked(Math.round(percent)),
			);
			const url = URL.createObjectURL(file);
			const link = document.createElement("a");
			link.href = url;
			link.download = libraryFileName(new Date());
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch {
			setProblem("The library couldn't be packed. Try again.");
		} finally {
			setPacked(undefined);
		}
	}

	async function importLibrary(file: File) {
		setProblem("");
		setRestoring(true);
		try {
			const dump = await unpackLibrary(file);
			const days = new Set(dump.reading.map((day) => day.date)).size;
			const go = confirm(
				`Restore ${count(dump.books.length, "book")}, ${count(dump.bookmarks.length, "save")} and ${count(days, "day")} of reading? Nothing in your library now is removed.`,
			);
			if (!go) return;
			await restoreLibrary(dump);
			location.reload();
		} catch (error) {
			setProblem(
				error instanceof LibraryFileError
					? error.message
					: "That file couldn't be restored.",
			);
		} finally {
			setRestoring(false);
		}
	}

	return (
		<>
			<SettingsRowInfo
				desc="Books, places, saves, history and settings. Not your Gemini key."
				label="Export library"
			>
				<button
					class={PLAIN}
					disabled={packed() !== undefined}
					onClick={() => void exportLibrary()}
					type="button"
				>
					{packed() === undefined ? "Export" : `${packed()}%`}
				</button>
			</SettingsRowInfo>
			<SettingsRowInfo
				desc="Adds an exported library's books and history to this one"
				label="Import library"
			>
				<button
					class={PLAIN}
					disabled={restoring()}
					onClick={() => picker?.click()}
					type="button"
				>
					{restoring() ? "Reading…" : "Import"}
				</button>
			</SettingsRowInfo>
			<input
				accept=".zip,application/zip"
				class="hidden"
				onChange={(event) => {
					const file = event.currentTarget.files?.[0];
					event.currentTarget.value = "";
					if (file) void importLibrary(file);
				}}
				ref={picker}
				type="file"
			/>
			<Show when={problem()}>
				<p class="-mt-1 mb-3 text-[13px] text-[oklch(0.6_0.2_30)]" role="alert">
					{problem()}
				</p>
			</Show>
		</>
	);
}
