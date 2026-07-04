import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import { paginate } from "../epub-renderer/paginator";
import { BlockRenderer } from "../epub-renderer/renderer";
import type { TypographyConfig } from "../epub-renderer/styles";
import type { Block } from "../epub-renderer/types";
import { useReaderSettings } from "../lib/reader-settings.tsx";

interface PaginatedChapterProps {
	blocks: Block[];
	title?: string;
	typography?: Partial<TypographyConfig>;
}

export default function PaginatedChapter(props: PaginatedChapterProps) {
	const [pageBlocks, setPageBlocks] = createSignal<Block[][]>([]);
	const { settings, themeColors } = useReaderSettings();

	function doPaginate() {
		const result = paginate(props.blocks, {
			pageHeight: window.innerHeight,
			pageWidth: window.innerWidth,
			titleHeight: props.title ? 60 : 0,
			fontSize: settings().fontSize,
			lineHeight: settings().lineHeight,
			hPadding: settings().hPadding,
			textColor: themeColors().textColor,
			bgColor: themeColors().bgColor,
			typography: props.typography,
		});
		setPageBlocks(result.pages);
	}

	onMount(() => requestAnimationFrame(doPaginate));

	createEffect(() => {
		void settings().fontSize;
		void settings().lineHeight;
		requestAnimationFrame(doPaginate);
	});

	return (
		<For each={pageBlocks()}>
			{(blocks, idx) => (
				<div
					class="snap-page flex h-dvh flex-col overflow-hidden"
					style={
						{
							background: themeColors().bgColor,
							color: themeColors().textColor,
						} as unknown as Record<string, string>
					}
				>
					<Show when={props.title && idx() === 0}>
						<h2 class="shrink-0 px-6 pt-6 pb-2 font-bold text-xl">
							{props.title}
						</h2>
					</Show>
					<div class="min-h-0 flex-1 overflow-hidden">
						<BlockRenderer
							blocks={blocks}
							theme={{
								textColor: themeColors().textColor,
								bgColor: themeColors().bgColor,
							}}
							settings={{
								fontSize: settings().fontSize,
								lineHeight: settings().lineHeight,
								hPadding: settings().hPadding,
							}}
							typography={props.typography}
						/>
					</div>
				</div>
			)}
		</For>
	);
}
