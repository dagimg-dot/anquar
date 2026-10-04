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
	onClick?: (e: MouseEvent & { currentTarget: HTMLButtonElement }) => void;
}

export default function NowReading(props: NowReadingProps) {
	return (
		<div class="px-4 mb-5 tablet:px-0">
			<button
				type="button"
				class="flex w-full gap-4 py-4 px-5 bg-surface border border-border rounded-2xl cursor-pointer [transition:transform_0.2s_cubic-bezier(0.16,1,0.3,1),border-color_0.2s] overflow-hidden active:scale-[0.98] hover:border-brand-500/60 tablet:text-left desktop:gap-7 desktop:p-6.5"
				onClick={props.onClick}
			>
				<BookCover
					data-cover={props.book.id}
					src={props.book.coverImage}
					progress={props.book.progress ?? 0}
					class="w-20 h-[120px] rounded-lg overflow-hidden shrink-0 bg-surface desktop:h-[186px] desktop:w-[124px]"
				/>
				<div class="relative flex-1 flex flex-col justify-center min-w-0">
					<svg
						class="absolute right-0 top-0 w-5 h-5 text-ink-soft desktop:hidden"
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
					<div class="text-lg font-bold tracking-[-0.01em] mb-px whitespace-nowrap overflow-hidden text-ellipsis text-ink desktop:text-[30px] desktop:leading-[1.1] desktop:tracking-[-0.03em]">
						{props.book.title}
					</div>
					<div class="text-sm text-ink-soft mb-2.5">{props.book.author}</div>
					<div class="flex items-center gap-2 desktop:my-3 desktop:max-w-md">
						<ProgressBar percent={props.book.progress ?? 0} class="flex-1" />
						<span class="text-xs font-semibold text-ink-soft whitespace-nowrap">
							{Math.round(props.book.progress ?? 0)}%
						</span>
					</div>
					{/* Not a button of its own: the whole card is one. */}
					<span class="mt-3 hidden h-11 items-center self-start rounded-full bg-brand-500 px-5 font-bold text-canvas desktop:inline-flex">
						Continue reading
					</span>
				</div>
			</button>
		</div>
	);
}
