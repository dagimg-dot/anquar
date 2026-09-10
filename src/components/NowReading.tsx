import BookCover from "./BookCover";
import ProgressBar from "./ProgressBar";

interface NowReadingProps {
	book: {
		id: string;
		title: string;
		author: string;
		coverImage?: string;
		progress?: number;
	};
	onClick?: () => void;
}

export default function NowReading(props: NowReadingProps) {
	return (
		<div class="px-4 mb-5">
			<button
				type="button"
				class="flex w-full gap-4 py-4 px-5 bg-surface border border-border rounded-2xl cursor-pointer [transition:transform_0.2s_cubic-bezier(0.16,1,0.3,1),border-color_0.2s] overflow-hidden active:scale-[0.98]"
				onClick={props.onClick}
			>
				<BookCover
					src={props.book.coverImage}
					progress={props.book.progress ?? 0}
					class="w-20 h-[120px] rounded-lg overflow-hidden shrink-0 bg-surface"
				/>
				<div class="relative flex-1 flex flex-col justify-center min-w-0">
					<svg
						class="absolute right-0 top-0 w-5 h-5 text-ink-soft"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path d="m9 18 6-6-6-6" />
					</svg>
					<div class="text-[11px] font-medium text-brand-500 uppercase tracking-[0.06em] mb-1">
						Continue Reading
					</div>
					<div class="text-lg font-bold tracking-[-0.01em] mb-px whitespace-nowrap overflow-hidden text-ellipsis text-ink">
						{props.book.title}
					</div>
					<div class="text-sm text-ink-soft mb-2.5">{props.book.author}</div>
					<div class="flex items-center gap-2">
						<ProgressBar percent={props.book.progress ?? 0} class="flex-1" />
						<span class="text-xs font-semibold text-ink-soft whitespace-nowrap">
							{Math.round(props.book.progress ?? 0)}%
						</span>
					</div>
				</div>
			</button>
		</div>
	);
}
