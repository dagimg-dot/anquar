import { createSignal, Show } from "solid-js";
import { dumpLibrary, eraseLibrary, restoreLibrary } from "../lib/db";
import {
	LibraryFileError,
	libraryFileName,
	packLibrary,
	unpackLibrary,
} from "../lib/library-file";
import BottomSheet from "./BottomSheet";
import { SettingsRowInfo } from "./SettingsSection";

const BUTTON =
	"min-w-[5.5rem] shrink-0 cursor-pointer rounded-xl border px-4 py-2 text-center font-semibold text-sm tabular-nums transition-transform duration-200 active:scale-95 disabled:cursor-default disabled:opacity-60";
const PLAIN = `${BUTTON} border-border bg-surface`;
const DANGER = `${BUTTON} border-[oklch(0.5_0.18_30/0.25)] bg-[oklch(0.5_0.18_30/0.12)] text-[oklch(0.6_0.2_30)]`;

const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export default function LibraryData() {
	const [packed, setPacked] = createSignal<number>();
	const [restoring, setRestoring] = createSignal(false);
	const [asking, setAsking] = createSignal(false);
	const [erasing, setErasing] = createSignal(false);
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

	async function erase() {
		setErasing(true);
		try {
			await eraseLibrary();
			location.reload();
		} catch {
			setErasing(false);
			setAsking(false);
			setProblem("The library couldn't be cleared. Try again.");
		}
	}

	return (
		<>
			<SettingsRowInfo
				desc="Everything but your Gemini key"
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
				desc="Adds an exported library to this one"
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
			<SettingsRowInfo
				desc="Erases every book and all history"
				label="Clear library"
			>
				<button class={DANGER} onClick={() => setAsking(true)} type="button">
					Clear
				</button>
			</SettingsRowInfo>
			<Show when={problem()}>
				<p class="-mt-1 mb-3 text-[13px] text-[oklch(0.6_0.2_30)]" role="alert">
					{problem()}
				</p>
			</Show>

			<BottomSheet
				dim
				onClose={() => !erasing() && setAsking(false)}
				open={asking()}
				title="Clear your library?"
			>
				<div class="flex flex-col gap-3 pb-2 text-[15px] text-ink-soft leading-snug">
					<p>
						Every book, place and save goes, and so do your reading history and
						streak. Your settings and Gemini key stay.
					</p>
					<p>
						This can't be undone. Export the library first if you might want it
						back.
					</p>
					<div class="mt-2 flex gap-2">
						<button
							class="h-12 flex-1 rounded-2xl border border-border bg-surface font-semibold text-[15px] text-ink transition-transform active:scale-[0.98] disabled:opacity-40"
							disabled={erasing()}
							onClick={() => setAsking(false)}
							type="button"
						>
							No
						</button>
						<button
							class="h-12 flex-1 rounded-2xl bg-[oklch(0.58_0.2_28)] font-semibold text-[15px] text-white transition-transform active:scale-[0.98] disabled:opacity-60"
							disabled={erasing()}
							onClick={() => void erase()}
							type="button"
						>
							{erasing() ? "Clearing…" : "Yes, sure"}
						</button>
					</div>
				</div>
			</BottomSheet>
		</>
	);
}
