import { CaretDown } from "phosphor-solid";
import { createSignal, For, Show } from "solid-js";
import { RELEASES, type Release, releasesAfter } from "../lib/changelog.ts";
import { closeWhatsNew, whatsNewOpen, whatsNewSince } from "../lib/update.ts";
import BottomSheet from "./BottomSheet.tsx";

const when = (date: string) => {
	const day = new Date(`${date}T12:00:00`);
	return day.toLocaleDateString("en", {
		month: "long",
		day: "numeric",
		year:
			day.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
	});
};

/**
 * What the releases brought. Those not seen before the sheet opened lead, in full; everything before folds
 * under Earlier, a title and date each, so the first screen says what just changed however long the history.
 * With nothing new, the newest release leads.
 */
export default function ChangelogSheet() {
	const fresh = () => releasesAfter(whatsNewSince());
	const lead = () => (fresh().length ? fresh() : RELEASES.slice(0, 1));
	const earlier = () => RELEASES.slice(lead().length);

	return (
		<BottomSheet
			dim
			onClose={closeWhatsNew}
			open={whatsNewOpen()}
			title="What's new"
		>
			<div class="pb-2">
				<For each={lead()}>
					{(release, i) => (
						<article
							class="pb-5"
							classList={{ "border-border border-t pt-4": i() > 0 }}
						>
							<Meta isNew={fresh().includes(release)} release={release} />
							<h3 class="mt-1.5 mb-3 font-medium font-read text-[26px] text-ink leading-[1.12] tracking-[-0.015em]">
								{release.title}
							</h3>
							<Notes class="text-[15.5px] text-ink" notes={release.notes} />
						</article>
					)}
				</For>

				<Show when={earlier().length > 0}>
					<div class="border-border border-t pt-3.5">
						<div class="mb-1 font-semibold text-[12.5px] text-ink-muted">
							Earlier
						</div>
						<For each={earlier()}>
							{(release) => <Fold release={release} />}
						</For>
					</div>
				</Show>
			</div>
		</BottomSheet>
	);
}

function Meta(props: { release: Release; isNew?: boolean }) {
	return (
		<div class="flex items-center gap-2 font-medium text-[12.5px] text-ink-muted">
			<span>
				{props.release.version} · {when(props.release.date)}
			</span>
			<Show when={props.isNew}>
				<span class="inline-flex h-5 items-center rounded-full bg-brand-500/18 px-2 font-bold text-[11px] text-brand-500 tracking-[0.02em]">
					New
				</span>
			</Show>
		</div>
	);
}

function Notes(props: { notes: string[]; class: string }) {
	return (
		<ul class={`flex flex-col gap-2 leading-[1.45] ${props.class}`}>
			<For each={props.notes}>
				{(note) => (
					<li class="relative pl-4 before:absolute before:top-[0.6em] before:left-0.5 before:size-[5px] before:rounded-full before:bg-current before:opacity-45">
						{note}
					</li>
				)}
			</For>
		</ul>
	);
}

function Fold(props: { release: Release }) {
	const [open, setOpen] = createSignal(false);
	return (
		<div class="border-border border-b last:border-b-0">
			<button
				aria-expanded={open()}
				class="flex w-full items-center gap-2.5 py-3 text-left"
				onClick={() => setOpen((o) => !o)}
				type="button"
			>
				<div class="min-w-0 flex-1">
					<div class="font-medium font-read text-[17px] text-ink leading-tight tracking-[-0.01em]">
						{props.release.title}
					</div>
					<div class="mt-0.5">
						<Meta release={props.release} />
					</div>
				</div>
				{/* phosphor-solid reads class once, so the turn is on a span around it. */}
				<span
					class="flex shrink-0 text-ink-muted transition-transform duration-200"
					classList={{ "rotate-180": open() }}
				>
					<CaretDown size={16} />
				</span>
			</button>
			<Show when={open()}>
				<Notes
					class="pb-3.5 text-[14.5px] text-ink-soft"
					notes={props.release.notes}
				/>
			</Show>
		</div>
	);
}
