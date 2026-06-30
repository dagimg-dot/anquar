import { BookOpen, Plus } from "phosphor-solid";
import { createSignal, Show } from "solid-js";
import toast from "solid-toast";
import { saveBook } from "../lib/db.ts";
import { useEpubParser } from "../lib/epub.ts";

interface FilePickerProps {
  onBookLoaded: (bookId: string) => void;
}

export default function FilePicker(props: FilePickerProps) {
  const { parse, parsing, error } = useEpubParser();
  const [dragOver, setDragOver] = createSignal(false);

  // biome-ignore lint/suspicious/noUnassignedVariables: assigned by ref
  let inputRef: HTMLInputElement | undefined;

  async function handleFile(file: File) {
    if (!file.name.endsWith(".epub")) {
      return;
    }

    try {
      const result = await parse(file);
      const bookId = await saveBook(
        result.metadata,
        result.chapters,
        result.toc,
        result.coverImage ?? undefined
      );
      toast.success(`${result.metadata.title} imported successfully`);
      props.onBookLoaded(bookId);
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
    // biome-ignore lint/a11y/useSemanticElements: drag-and-drop zone
    // biome-ignore lint/a11y/useFocusableInteractive: drag-and-drop zone
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
              <h2 class="font-bold text-ink text-xl">Import your first book</h2>
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
  );
}
