import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { useReaderSettings } from "../lib/reader-settings.tsx";

interface PaginatedChapterProps {
  css: Array<{ id: string; href: string }>;
  html: string;
  title?: string;
}

export default function PaginatedChapter(props: PaginatedChapterProps) {
  // biome-ignore lint/suspicious/noUnassignedVariables: assigned by ref
  let measurerRef: HTMLDivElement | undefined;
  // biome-ignore lint/suspicious/noUnassignedVariables: assigned by ref
  let styleAnchor: HTMLDivElement | undefined;
  const [pages, setPages] = createSignal<string[]>([]);
  const { settings, themeColors } = useReaderSettings();

  // Inject EPUB CSS into the document head (shared globally)
  onMount(() => {
    if (!styleAnchor) {
      return;
    }
    const styles: HTMLStyleElement[] = [];
    for (const sheet of props.css) {
      const style = document.createElement("style");
      style.textContent = sheet.href;
      document.head.appendChild(style);
      styles.push(style);
    }
    onCleanup(() => {
      for (const s of styles) {
        s.remove();
      }
    });
  });

  // Split content into viewport-height pages
  function paginate() {
    if (!measurerRef) {
      setPages([props.html]);
      return;
    }

    const measurer = measurerRef;
    // Set the measurer up to match a snap-page exactly
    measurer.style.height = "100dvh";
    measurer.style.overflow = "hidden";
    measurer.style.width = `${window.innerWidth}px`;
    measurer.style.paddingLeft = `${settings().hPadding}rem`;
    measurer.style.paddingRight = `${settings().hPadding}rem`;
    measurer.style.fontSize = `${settings().fontSize}%`;
    measurer.style.lineHeight = `${settings().lineHeight}`;
    measurer.style.columnFill = "auto";
    measurer.style.columnGap = "0";
    measurer.style.visibility = "visible";
    measurer.style.position = "fixed";
    measurer.style.left = "-9999px";
    measurer.style.top = "0";
    measurer.innerHTML = props.html;

    // Traverse block-level children and accumulate
    const children = Array.from(measurer.children).filter(
      (child) => child instanceof HTMLElement
    ) as HTMLElement[];

    const pageHeight = window.innerHeight;
    const result: string[] = [];
    let batch: HTMLElement[] = [];
    let batchHeight = 0;

    // Measure with a small buffer to avoid single-line overflow
    const BUFFER = 4;

    for (const child of children) {
      const h = child.offsetHeight;

      if (batch.length > 0 && batchHeight + h > pageHeight - BUFFER) {
        // Flush current page
        result.push(batch.map((el) => el.outerHTML).join(""));
        batch = [];
        batchHeight = 0;
      }

      batch.push(child);
      batchHeight += h;
    }

    if (batch.length > 0) {
      result.push(batch.map((el) => el.outerHTML).join(""));
    }

    // Fallback: if no pages were created or height measurement collapsed
    if (result.length === 0) {
      result.push(props.html);
    }

    setPages(result);
    measurer.innerHTML = ""; // clear for next measure
    measurer.style.visibility = "hidden";
  }

  // Measure on mount
  onMount(() => requestAnimationFrame(paginate));

  // Re-measure when settings change
  createEffect(() => {
    const deps = [settings().fontSize, settings().lineHeight];
    Array.isArray(deps);
    requestAnimationFrame(paginate);
  });

  const snapPageStyle = () =>
    ({
      background: themeColors().bgColor,
      color: themeColors().textColor,
    }) as unknown as Record<string, string>;

  return (
    <>
      <div class="hidden" ref={styleAnchor} />

      <div
        aria-hidden="true"
        class="reader-content"
        ref={measurerRef}
        style={
          {
            position: "fixed",
            left: "-9999px",
            top: "0",
            pointerEvents: "none",
            visibility: "hidden",
          } as unknown as Record<string, string>
        }
      />

      <For each={pages()}>
        {(pageHtml, idx) => (
          <div
            class="snap-page flex h-dvh flex-col overflow-hidden"
            style={snapPageStyle()}
          >
            <Show when={props.title && idx() === 0}>
              <h2 class="shrink-0 px-6 pt-6 pb-2 font-bold text-xl">
                {props.title}
              </h2>
            </Show>
            <div
              class="min-h-0 flex-1 overflow-hidden"
              style={
                {
                  paddingLeft: `${settings().hPadding}rem`,
                  paddingRight: `${settings().hPadding}rem`,
                  fontSize: `${settings().fontSize}%`,
                  lineHeight: `${settings().lineHeight}`,
                } as unknown as Record<string, string>
              }
            >
              <div class="reader-content" innerHTML={pageHtml} />
            </div>
          </div>
        )}
      </For>
    </>
  );
}
