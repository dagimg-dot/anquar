import { BookOpen } from "phosphor-solid";
import { Show } from "solid-js";
import { useReaderSettings } from "../lib/reader-settings.tsx";

interface CoverCardProps {
	author: string;
	chapterCount: number;
	coverUrl?: string;
	onStartReading?: () => void;
	title: string;
}

export default function CoverCard(props: CoverCardProps) {
	const { themeColors } = useReaderSettings();

	return (
		<div
			class="snap-page flex h-dvh flex-col items-center justify-center gap-6 px-6"
			style={{
				background: themeColors().bgColor,
				color: themeColors().textColor,
			}}
		>
			<Show
				fallback={
					<div class="flex h-64 w-44 items-center justify-center rounded-2xl bg-black/5 shadow-xl">
						<BookOpen class="h-16 w-16 opacity-40" size={64} />
					</div>
				}
				when={props.coverUrl}
			>
				<img
					alt={props.title}
					class="h-64 w-44 rounded-2xl object-cover shadow-xl"
					src={props.coverUrl}
				/>
			</Show>

			<div class="text-center">
				<h1 class="text-balance font-bold text-2xl">{props.title}</h1>
				<p class="mt-2 opacity-70">{props.author}</p>
				<p class="mt-1 text-sm opacity-50">{props.chapterCount} chapters</p>
			</div>

			<Show when={props.onStartReading}>
				<button
					class="rounded-xl bg-brand-500 px-8 py-3 font-medium text-white transition-colors hover:bg-brand-600"
					onClick={props.onStartReading}
					type="button"
				>
					Start Reading
				</button>
			</Show>
		</div>
	);
}
