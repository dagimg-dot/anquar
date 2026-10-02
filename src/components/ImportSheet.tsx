import { useNavigate } from "@solidjs/router";
import { createSignal, For, type JSX, Match, Show, Switch } from "solid-js";
import { FAILURE_HINT, FAILURE_TEXT } from "../lib/import-check";
import {
	addCopy,
	busy,
	cancelImports,
	closeImports,
	type ImportJob,
	importFiles,
	importsOpen,
	jobs,
	pickBooks,
	readingTime,
	registerPicker,
} from "../lib/imports";
import { openBook } from "../lib/transitions";
import { useCloseOnBack } from "../lib/useCloseOnBack";
import { useSheetDrag } from "../lib/useSheetDrag";

const STEPS = ["Opening", "Reading", "Saving"] as const;
const STEP_OF: Partial<Record<ImportJob["state"], number>> = {
	opening: 0,
	reading: 1,
	saving: 2,
};

const STATUS: Record<ImportJob["state"], string> = {
	waiting: "Waiting",
	opening: "Opening…",
	reading: "Reading…",
	saving: "Saving…",
	added: "In your library",
	already: "Already in your library",
	failed: "",
	cancelled: "Cancelled",
};

function Cover(props: { job: ImportJob }) {
	return (
		<Show
			fallback={
				<div class="flex size-full flex-col justify-center bg-[linear-gradient(160deg,oklch(0.34_0.06_158),oklch(0.2_0.03_168))] p-3 text-center font-bold text-[13px] text-white leading-tight">
					{props.job.title}
				</div>
			}
			when={props.job.cover}
		>
			<img alt="" class="size-full object-cover" src={props.job.cover} />
		</Show>
	);
}

function Button(props: {
	children: JSX.Element;
	onClick: () => void;
	primary?: boolean;
}) {
	return (
		<button
			class="h-12 w-full cursor-pointer rounded-2xl font-semibold text-[15px] transition-transform active:scale-[0.98]"
			classList={{
				"bg-brand-500 text-canvas": props.primary,
				"border border-border text-ink": !props.primary,
			}}
			onClick={() => props.onClick()}
			type="button"
		>
			{props.children}
		</button>
	);
}

function Book(props: { job: ImportJob }) {
	const step = () => STEP_OF[props.job.state] ?? -1;
	const meta = () => {
		const j = props.job;
		if (j.state === "already")
			return j.percent ? `${Math.round(j.percent)}% read` : "Not started yet";
		if (!j.chapters) return "";
		return `${j.chapters} chapters · ${readingTime(j.words ?? 0)}`;
	};

	return (
		<div class="flex flex-col items-center text-center">
			<div
				class="import-slot"
				classList={{
					turned: props.job.title !== undefined,
					failed: props.job.state === "failed",
				}}
			>
				<div
					class="import-face import-back"
					classList={{ "import-shimmer": busy(props.job) }}
				>
					<span>{props.job.fileName}</span>
				</div>
				<div class="import-face import-front">
					<Cover job={props.job} />
				</div>
			</div>
			<Show when={props.job.title !== undefined || busy(props.job)}>
				<div class="mt-3.5 min-h-6 font-bold text-ink text-lg tracking-[-0.01em]">
					{props.job.title}
				</div>
				<div class="min-h-5 text-[13px] text-ink-soft">{props.job.author}</div>
				<div
					class="mt-0.5 min-h-[18px] text-xs"
					classList={{
						"text-brand-500": props.job.state === "already",
						"text-ink-muted": props.job.state !== "already",
					}}
				>
					{meta()}
				</div>
			</Show>

			<Show when={busy(props.job)}>
				<div class="mt-4 flex items-center gap-2 text-[11.5px] text-ink-muted">
					<For each={STEPS}>
						{(name, i) => (
							<>
								<span classList={{ "text-ink": step() >= i() }}>{name}</span>
								<Show when={i() < STEPS.length - 1}>
									<i class="relative h-[3px] w-8 overflow-hidden rounded-full bg-border">
										<i
											class="absolute inset-0 origin-left bg-brand-500 transition-transform duration-500"
											style={{
												transform: step() > i() ? "none" : "scaleX(0)",
											}}
										/>
									</i>
								</Show>
							</>
						)}
					</For>
				</div>
			</Show>

			<Switch>
				<Match when={props.job.state === "failed" && props.job.failure}>
					{(failure) => (
						<p class="mt-3.5 max-w-[30ch] text-[13.5px] text-ink-soft leading-snug">
							<b class="font-semibold text-flame">{FAILURE_TEXT[failure()]}</b>{" "}
							{FAILURE_HINT[failure()]}
						</p>
					)}
				</Match>
				<Match when={props.job.slow && busy(props.job)}>
					<p class="mt-3.5 max-w-[30ch] text-[13.5px] text-ink-soft leading-snug">
						Still reading.{" "}
						<b class="font-semibold text-ink">Big books with many pictures</b>{" "}
						take longer.
					</p>
				</Match>
				<Match when={props.job.state === "cancelled"}>
					<p class="mt-3.5 text-[13.5px] text-ink-soft">Import cancelled.</p>
				</Match>
			</Switch>
		</div>
	);
}

function Row(props: { job: ImportJob }) {
	const working = () => busy(props.job) && props.job.state !== "waiting";
	return (
		<div class="flex items-center gap-3 rounded-xl border border-border bg-canvas p-2">
			<div
				class="h-[51px] w-[34px] shrink-0 overflow-hidden rounded-[5px] bg-surface-elevated"
				classList={{ "import-shimmer": working() }}
			>
				<Show when={props.job.title}>
					<Cover job={props.job} />
				</Show>
			</div>
			<div class="min-w-0 flex-1">
				<div class="truncate font-semibold text-[13.5px] text-ink">
					{props.job.title ?? props.job.fileName}
				</div>
				<div
					class="text-xs"
					classList={{
						"text-flame": props.job.state === "failed",
						"text-ink-soft": props.job.state !== "failed",
					}}
				>
					{props.job.failure
						? FAILURE_TEXT[props.job.failure]
						: STATUS[props.job.state]}
				</div>
			</div>
			<div class="w-6 text-center text-brand-500">
				<Switch>
					<Match when={working()}>
						<span class="inline-block size-4 animate-spin rounded-full border-2 border-border border-t-brand-500" />
					</Match>
					<Match when={props.job.state === "added"}>✓</Match>
					<Match when={props.job.state === "already"}>↺</Match>
					<Match when={props.job.state === "failed"}>
						<span class="text-flame">!</span>
					</Match>
				</Switch>
			</div>
		</div>
	);
}

// The sheet every import goes through, from the + buttons or a file shared to Anquar. One book gets the
// book itself, several get a list, and nothing closes it while a book is still being read except ×.
export default function ImportSheet() {
	const navigate = useNavigate();
	const single = () => (jobs.length === 1 ? jobs[0] : undefined);
	const working = () => jobs.some(busy);
	const count = (state: ImportJob["state"]) =>
		jobs.filter((j) => j.state === state).length;
	const firstAdded = () => jobs.find((j) => j.state === "added");
	// Back does what the sheet's × does: cancels a running import, otherwise closes.
	useCloseOnBack(importsOpen, () =>
		working() ? cancelImports() : closeImports(),
	);
	// Pulled down it closes like any sheet, except while a book is still being read: then it only gives.
	const [panel, setPanel] = createSignal<HTMLDivElement>();
	const drag = useSheetDrag(panel, closeImports, () => !working());

	const title = () => {
		const one = single();
		if (one)
			return busy(one)
				? "Adding a book"
				: {
						added: "In your library",
						already: "Already in your library",
						failed: "Couldn't add this book",
						cancelled: "Import cancelled",
					}[one.state as "added" | "already" | "failed" | "cancelled"];
		if (working()) return `Adding ${jobs.length} books`;
		return [
			count("added") && `${count("added")} added`,
			count("already") && `${count("already")} already there`,
			count("failed") && `${count("failed")} couldn't be read`,
			count("cancelled") && `${count("cancelled")} cancelled`,
		]
			.filter(Boolean)
			.join(" · ");
	};

	const startReading = (id: string | undefined) => {
		if (!id) return;
		closeImports();
		openBook(() => navigate(`/book/${id}`), id);
	};

	return (
		<>
			<input
				accept=".epub,application/epub+zip"
				class="hidden"
				multiple
				onChange={(e) => {
					const input = e.currentTarget;
					importFiles([...(input.files ?? [])]);
					input.value = "";
				}}
				ref={registerPicker}
				type="file"
			/>

			{/* biome-ignore lint/a11y/noStaticElementInteractions: dismiss target, not a control */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: the sheet's × closes it from the keyboard */}
			<div
				class="fixed inset-0 z-[70] bg-black/55 transition-opacity duration-300"
				classList={{ "pointer-events-none opacity-0": !importsOpen() }}
				onClick={closeImports}
				style={
					importsOpen()
						? {
								opacity: 1 - drag.pulled(),
								transition: drag.dragging() ? "none" : undefined,
							}
						: undefined
				}
			/>

			<div
				aria-hidden={!importsOpen()}
				aria-label={title()}
				aria-modal="true"
				class="fixed inset-x-0 bottom-0 z-[71] mx-auto max-w-lg rounded-t-[1.5rem] border-border border-t bg-surface px-5 pt-2.5 after:absolute after:inset-x-0 after:top-full after:h-24 after:bg-surface"
				ref={setPanel}
				role="dialog"
				style={{
					transform: importsOpen()
						? `translateY(${drag.offset()}px)`
						: "translateY(105%)",
					transition: drag.transition(
						"transform 560ms cubic-bezier(0.16, 1, 0.3, 1)",
					),
					"padding-bottom": "max(1.5rem, env(safe-area-inset-bottom))",
				}}
			>
				<div class="mx-auto mb-3 h-[5px] w-9 rounded-full bg-ink-muted/50" />
				<div class="mb-4 flex items-center justify-between gap-3">
					<h2 class="font-bold text-base text-ink">{title()}</h2>
					<button
						aria-label={working() ? "Cancel import" : "Close"}
						class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-elevated text-ink-soft transition-transform active:scale-90"
						onClick={() => (working() ? cancelImports() : closeImports())}
						type="button"
					>
						<svg
							aria-hidden="true"
							class="size-3.5"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							viewBox="0 0 24 24"
						>
							<path d="M6 6l12 12M18 6L6 18" />
						</svg>
					</button>
				</div>

				<Show
					fallback={
						<div class="flex max-h-[50dvh] flex-col gap-2.5 overflow-y-auto overscroll-contain">
							<For each={jobs}>{(job) => <Row job={job} />}</For>
						</div>
					}
					when={single()}
				>
					{(job) => <Book job={job()} />}
				</Show>

				<Show when={!working()}>
					<div class="mt-5 flex flex-col gap-2.5">
						<Switch>
							<Match when={single()?.state === "added"}>
								<Button onClick={() => startReading(single()?.bookId)} primary>
									Start reading
								</Button>
								<Button onClick={closeImports}>Done</Button>
							</Match>
							<Match when={single()?.state === "already"}>
								<Button onClick={() => startReading(single()?.bookId)} primary>
									Open it
								</Button>
								<Button onClick={() => void addCopy(single()?.key ?? 0)}>
									Add a copy
								</Button>
							</Match>
							<Match when={single()}>
								<Button onClick={pickBooks} primary>
									Choose another file
								</Button>
								<Button onClick={closeImports}>Close</Button>
							</Match>
							<Match when={firstAdded()}>
								{(book) => (
									<Button onClick={() => startReading(book().bookId)} primary>
										Start reading {book().title}
									</Button>
								)}
							</Match>
						</Switch>
						<Show when={!single()}>
							<Button onClick={closeImports}>Done</Button>
						</Show>
					</div>
				</Show>
			</div>
		</>
	);
}
