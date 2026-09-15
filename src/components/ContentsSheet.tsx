import { createResource, For, Show } from "solid-js";
import { chapterLabel } from "../lib/chapters.ts";
import { listChapterTitles } from "../lib/db.ts";
import BookCover from "./BookCover.tsx";

interface ContentsSheetProps {
	author: string;
	bookId: string;
	coverUrl?: string;
	currentChapter: number;
	onJump: (chapterIndex: number) => void;
	/** 0–1 through the whole book. */
	progress: number;
	savedCount: number;
	title: string;
}

export default function ContentsSheet(props: ContentsSheetProps) {
	const [chapters] = createResource(() => props.bookId, listChapterTitles);

	return (
		<div class="pb-2">
			<div class="flex items-center gap-3 border-border-light border-b pb-4">
				<BookCover class="w-11" src={props.coverUrl} />
				<div class="min-w-0">
					<div class="truncate font-semibold text-[16px] text-ink tracking-[-0.015em]">
						{props.title}
					</div>
					<div class="truncate text-[13px] text-ink-soft">{props.author}</div>
					<div class="mt-1.5 flex gap-3.5 text-[11.5px] text-ink-soft tabular-nums">
						<span>{props.savedCount} saved</span>
						<span>{Math.round(props.progress * 100)}% read</span>
					</div>
				</div>
			</div>

			<Show
				fallback={<div class="py-3 text-[14px] text-ink-soft">Loading…</div>}
				when={chapters()}
			>
				{(list) => (
					<div class="flex flex-col">
						<For each={list()}>
							{(ch) => (
								<button
									class="flex items-center gap-2.5 rounded-lg px-1 py-3 text-left text-[14.5px] text-ink transition-colors active:bg-surface-elevated"
									classList={{
										"font-semibold": ch.index === props.currentChapter,
									}}
									onClick={() => props.onJump(ch.index)}
									type="button"
								>
									{/* Every row carries the marker slot, so the titles keep one left edge. */}
									<span
										class="h-[15px] w-[3px] shrink-0 rounded-sm"
										classList={{
											"bg-ink": ch.index === props.currentChapter,
											"bg-transparent": ch.index !== props.currentChapter,
										}}
									/>
									<span class="min-w-0 flex-1 truncate">
										{chapterLabel(ch.title, ch.index)}
									</span>
									<Show when={ch.frontMatter}>
										<span class="shrink-0 text-[11px] text-ink-muted">
											front matter
										</span>
									</Show>
								</button>
							)}
						</For>
					</div>
				)}
			</Show>
		</div>
	);
}
