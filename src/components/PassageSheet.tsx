import { createEffect, createSignal, on, onCleanup, Show } from "solid-js";
import toast from "solid-toast";
import { removeBookmark } from "../lib/db";
import { tick } from "../lib/haptics";
import { type PassageShare, preparePassage } from "../lib/share-passage";
import BottomSheet from "./BottomSheet";
import ShareSheet from "./ShareSheet";

export interface HeldPassage {
	book: { author: string; coverUrl?: string; title: string };
	id: number;
	/** What's shared: the passage, or a whole card's opening ended cleanly (saved-quote.ts). */
	quote: string;
}

const CONFIRM_MS = 3000;

/**
 * What a held save offers, as the Library's held book does: share it, the reader's Share sheet taking the
 * sheet's place, or delete it, which asks for a second tap.
 */
export default function PassageSheet(props: {
	onClose: () => void;
	onDeleted: (id: number) => void;
	passage?: HeldPassage;
}) {
	// Kept after closing, so the sheet slides away showing the passage rather than nothing.
	const [passage, setPassage] = createSignal<HeldPassage>();
	const [sharing, setSharing] = createSignal<PassageShare>();
	const [drawing, setDrawing] = createSignal(false);
	const [confirming, setConfirming] = createSignal(false);
	let unconfirm: ReturnType<typeof setTimeout> | undefined;

	createEffect(
		on(
			() => props.passage,
			(held) => {
				if (!held) return;
				setPassage(held);
				setSharing(undefined);
				setConfirming(false);
			},
		),
	);
	onCleanup(() => clearTimeout(unconfirm));

	async function share() {
		const held = passage();
		if (!held || drawing()) return;
		setDrawing(true);
		const ready = await preparePassage(held.book, held.quote).finally(() =>
			setDrawing(false),
		);
		if (ready) setSharing(ready);
		else props.onClose();
	}

	async function remove() {
		const held = passage();
		if (!held) return;
		if (!confirming()) {
			tick();
			setConfirming(true);
			unconfirm = setTimeout(() => setConfirming(false), CONFIRM_MS);
			return;
		}
		clearTimeout(unconfirm);
		await removeBookmark(held.id);
		props.onDeleted(held.id);
		toast.success("Passage deleted");
		props.onClose();
	}

	return (
		<BottomSheet
			dim
			onClose={props.onClose}
			open={props.passage !== undefined}
			title={sharing() ? "Share" : "Saved passage"}
		>
			<Show
				fallback={
					<div class="flex flex-col gap-4 pb-2">
						<figure class="m-0 rounded-2xl bg-surface px-4 py-3.5">
							<blockquote class="m-0 line-clamp-6 font-read text-[16.5px] text-ink italic leading-normal">
								{passage()?.quote}
							</blockquote>
							<figcaption class="mt-2 truncate text-[12.5px] text-ink-soft">
								{passage()?.book.title}
							</figcaption>
						</figure>
						<div class="flex flex-col gap-2">
							<button
								class="h-12 w-full rounded-2xl bg-brand-500 font-semibold text-[15px] text-canvas transition-[transform,opacity] active:scale-[0.98] disabled:opacity-60"
								disabled={drawing()}
								onClick={() => void share()}
								type="button"
							>
								Share
							</button>
							<button
								class="h-12 w-full rounded-2xl font-semibold text-[15px] text-flame transition-[transform,background-color] active:scale-[0.98]"
								classList={{ "bg-flame/15": confirming() }}
								onClick={() => void remove()}
								type="button"
							>
								{confirming() ? "Tap again to delete" : "Delete passage"}
							</button>
						</div>
					</div>
				}
				keyed
				when={sharing()}
			>
				{(ready) => (
					<ShareSheet
						image={ready.image}
						name={ready.name}
						onShared={props.onClose}
						text={ready.text}
					/>
				)}
			</Show>
		</BottomSheet>
	);
}
