import { useNavigate } from "@solidjs/router";
import {
	ArrowUpRight,
	BookOpen,
	FolderOpen,
	MagnifyingGlass,
} from "phosphor-solid";
import { createEffect, createSignal, Show } from "solid-js";
import toast from "solid-toast";
import { addOpen, addReturning, browsed, closeAdd, FIND_URL } from "../lib/add";
import { pickBooks } from "../lib/imports";
import { bookPath } from "../lib/routes";
import { addStarter, hasStarter } from "../lib/starter";
import { openBook } from "../lib/transitions";
import BottomSheet from "./BottomSheet";

/**
 * Every + opens this: add EPUBs from the phone's files, find a book (a channel that posts where to get them,
 * opened outside the app), or start with Meditations if it isn't in the library. Coming back from that channel
 * after a while raises the sheet again pointing at Downloads (lib/add.ts).
 */
export default function AddSheet() {
	const navigate = useNavigate();
	const [offerStarter, setOfferStarter] = createSignal(false);
	const [adding, setAdding] = createSignal(false);

	createEffect(() => {
		if (addOpen()) void hasStarter().then((has) => setOfferStarter(!has));
	});

	// The picker has to open from this tap, so it opens as the sheet lets go; the import sheet takes over
	// from there.
	function fromFiles() {
		closeAdd();
		pickBooks();
	}

	async function startWithMeditations() {
		if (adding()) return;
		setAdding(true);
		try {
			const id = await addStarter();
			closeAdd();
			openBook(() => navigate(bookPath(id)), id);
		} catch {
			toast.error("Couldn't get Meditations. Check your connection.");
		} finally {
			setAdding(false);
		}
	}

	return (
		<BottomSheet dim onClose={closeAdd} open={addOpen()} title="Add a book">
			<div class="pb-2">
				<Show when={addReturning()}>
					<div class="mb-3 rounded-2xl bg-brand-500/12 px-4 py-3 text-[14px] text-ink leading-snug">
						<span class="font-semibold">Downloaded a book?</span> It's in your
						Downloads. Pick it below.
					</div>
				</Show>

				<button
					class="flex h-[68px] w-full items-center gap-3.5 rounded-2xl bg-brand-500 px-4 text-left text-canvas transition-transform active:scale-[0.98]"
					onClick={fromFiles}
					type="button"
				>
					<FolderOpen class="shrink-0" size={26} weight="fill" />
					<span class="min-w-0">
						<span class="block font-semibold text-[16px]">Add from files</span>
						<span class="block text-[13px] opacity-75">
							As many EPUBs as you like
						</span>
					</span>
				</button>

				<div class="mt-2 flex flex-col gap-2">
					<a
						class="flex h-[68px] items-center gap-3.5 rounded-2xl bg-surface px-4 text-ink transition-transform active:scale-[0.98]"
						href={FIND_URL}
						onClick={browsed}
						rel="noopener noreferrer"
						target="_blank"
					>
						<MagnifyingGlass
							class="shrink-0 text-brand-500"
							size={26}
							weight="bold"
						/>
						<span class="min-w-0 flex-1 font-semibold text-[16px]">
							Find a book
						</span>
						<ArrowUpRight
							class="shrink-0 text-ink-muted"
							size={18}
							weight="bold"
						/>
					</a>

					<Show when={offerStarter()}>
						<button
							class="flex h-[68px] w-full items-center gap-3.5 rounded-2xl bg-surface px-4 text-left transition-[transform,opacity] active:scale-[0.98] disabled:opacity-60"
							disabled={adding()}
							onClick={() => void startWithMeditations()}
							type="button"
						>
							<BookOpen
								class="shrink-0 text-brand-500"
								size={26}
								weight="fill"
							/>
							<span class="min-w-0 flex-1">
								<span class="block font-semibold text-[15px] text-ink">
									Start with Meditations
								</span>
								<span class="block text-[12.5px] text-ink-soft">
									{adding()
										? "Adding it…"
										: "Marcus Aurelius. Free, and ready now."}
								</span>
							</span>
						</button>
					</Show>
				</div>

				<p class="mt-3 hidden text-center text-[12.5px] text-ink-muted tablet:block">
					Or drop EPUBs anywhere on the window
				</p>
			</div>
		</BottomSheet>
	);
}
