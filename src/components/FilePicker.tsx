import { useNavigate } from "@solidjs/router";
import { BookOpen, Clock, Plus } from "phosphor-solid";
import { createSignal, For, onMount, Show } from "solid-js";
import toast from "solid-toast";
import { extractCssMeta } from "../epub-renderer/css-meta.ts";
import { parseChapter } from "../epub-renderer/parser.ts";
import { listBooks, saveBook } from "../lib/db.ts";
import { useEpubParser } from "../lib/epub.ts";

interface SavedBook {
	addedAt: string;
	author: string;
	chapterCount: number;
	coverImage?: string;
	id: string;
	lastOpenedAt?: string;
	title: string;
}

export default function FilePicker() {
	const navigate = useNavigate();
	const { parse, parsing, error } = useEpubParser();
	const [dragOver, setDragOver] = createSignal(false);
	const [books, setBooks] = createSignal<SavedBook[]>([]);

	let inputRef: HTMLInputElement | undefined;

	onMount(async () => {
		const saved = await listBooks();
		setBooks(saved);
	});

	async function handleFile(file: File) {
		if (!file.name.endsWith(".epub")) {
			return;
		}

		try {
			const result = await parse(file);

			// Parse HTML to blocks in the main thread (DOMParser available here)
			const chaptersWithBlocks = result.chapters.map((ch) => ({
				...ch,
				blocks: parseChapter(ch.html!),
			}));

			// Extract CSS metadata (fonts, direction, writing-mode)
			let cssMeta: import("../epub-renderer/types.ts").EpubCssMeta | undefined;
			if (result.firstHtml && result.allCssTexts) {
				const doc = new DOMParser().parseFromString(
					result.firstHtml,
					"text/html",
				);
				cssMeta = extractCssMeta(result.allCssTexts, doc);
			}

			const bookId = await saveBook(
				result.metadata,
				chaptersWithBlocks,
				result.toc,
				result.coverImage ?? undefined,
				cssMeta,
			);
			toast.success(`${result.metadata.title} imported successfully`);
			const saved = await listBooks();
			setBooks(saved);
			navigate(`/book/${bookId}`);
		} catch (err) {
			console.error("Failed to parse EPUB:", err);
		}
	}

	function onInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			handleFile(file);
			input.value = "";
		}
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer?.files[0];
		if (file) {
			handleFile(file);
		}
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		setDragOver(true);
	}

	function onDragLeave() {
		setDragOver(false);
	}

	return (
		<div class="flex flex-col">
			{/* biome-ignore lint/a11y/useSemanticElements: drag-and-drop zone */}
			{/* biome-ignore lint/a11y/useFocusableInteractive: drag-and-drop zone */}
			<div
				class={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-colors ${
					dragOver()
						? "border-brand-400 bg-brand-500/10"
						: "border-border bg-surface"
				}`}
				onDragLeave={onDragLeave}
				onDragOver={onDragOver}
				onDrop={onDrop}
				role="button"
				tabindex="0"
			>
				<input
					accept=".epub"
					class="hidden"
					onChange={onInputChange}
					ref={inputRef}
					type="file"
				/>

				<Show
					fallback={
						<div class="flex flex-col items-center gap-4">
							<div class="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
							<p class="text-ink-soft">Parsing EPUB...</p>
						</div>
					}
					when={!parsing()}
				>
					<Show
						fallback={
							<div class="flex flex-col items-center gap-4">
								<p class="text-red-400">{error()}</p>
								<button
									class="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-600"
									onClick={() => inputRef?.click()}
									type="button"
								>
									<Plus size={20} />
									Try Again
								</button>
							</div>
						}
						when={!error()}
					>
						<div class="flex flex-col items-center gap-4 text-center">
							<BookOpen class="h-16 w-16 text-ink-soft" size={64} />
							<div>
								<h2 class="font-bold text-ink text-xl">
									Import your first book
								</h2>
								<p class="mt-2 text-ink-soft">
									Drag and drop an EPUB file here, or tap to browse
								</p>
							</div>
							<button
								class="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-600"
								onClick={() => inputRef?.click()}
								type="button"
							>
								<Plus size={20} />
								Import EPUB
							</button>
						</div>
					</Show>
				</Show>
			</div>

			<Show when={books().length > 0}>
				<div class="mt-8">
					<h2 class="mb-4 font-bold text-ink text-lg">Your Books</h2>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
						<For each={books()}>
							{(book) => (
								<button
									class="group flex flex-col overflow-hidden rounded-xl bg-surface text-left shadow-sm transition-all hover:shadow-md"
									onClick={() => navigate(`/book/${book.id}`)}
									type="button"
								>
									<Show
										fallback={
											<div class="flex aspect-[3/4] items-center justify-center bg-canvas">
												<BookOpen class="h-12 w-12 text-ink-soft" size={48} />
											</div>
										}
										when={book.coverImage}
									>
										<img
											alt={book.title}
											class="aspect-[3/4] w-full object-cover"
											height={256}
											src={book.coverImage ?? ""}
											width={192}
										/>
									</Show>
									<div class="flex flex-col gap-0.5 p-3">
										<span class="line-clamp-2 font-medium text-ink text-sm leading-tight">
											{book.title}
										</span>
										<span class="line-clamp-1 text-ink-soft text-xs">
											{book.author}
										</span>
										<span class="flex items-center gap-1 text-ink-soft text-xs">
											<Clock size={12} />
											{book.chapterCount} chapters
										</span>
									</div>
								</button>
							)}
						</For>
					</div>
				</div>
			</Show>
		</div>
	);
}
