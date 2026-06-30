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
    const pageHeight = window.innerHeight;
    const padRem = settings().hPadding;

    // Set measurer styles to match snap-page dimensions exactly
    measurer.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${window.innerWidth}px;
      padding-left: ${padRem}rem;
      padding-right: ${padRem}rem;
      font-size: ${settings().fontSize}%;
      line-height: ${settings().lineHeight};
      visibility: visible;
    `;
    measurer.innerHTML = props.html;

    // Flatten block-level content: walk all descendants, collect leaf blocks
    function collectBlocks(el: HTMLElement): HTMLElement[] {
      const blocks: HTMLElement[] = [];
      const INLINE = new Set([
        "span",
        "a",
        "em",
        "strong",
        "b",
        "i",
        "u",
        "code",
        "br",
        "img",
      ]);
      const WRAPPERS = new Set([
        "div",
        "section",
        "article",
        "main",
        "header",
        "footer",
      ]);

      for (const child of Array.from(el.children) as HTMLElement[]) {
        const tag = child.tagName.toLowerCase();
        if (child.children.length === 0 && !child.textContent?.trim()) {
          continue;
        }
        if (INLINE.has(tag) || !WRAPPERS.has(tag)) {
          blocks.push(child);
        } else if (child.children.length <= 2) {
          blocks.push(...collectBlocks(child));
        } else {
          blocks.push(child);
        }
      }
      return blocks;
    }

    const allBlocks = collectBlocks(measurer);
    if (allBlocks.length === 0) {
      setPages([props.html]);
      measurer.style.visibility = "hidden";
      return;
    }

    const result: string[] = [];

    for (let i = 0; i < allBlocks.length; ) {
      const pageDiv = document.createElement("div");
      pageDiv.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: ${window.innerWidth}px;
        font-size: ${settings().fontSize}%;
        line-height: ${settings().lineHeight};
        --reader-h-padding: ${padRem}rem;
        padding: 0;
        margin: 0;
      `;
      measurer.parentNode?.appendChild(pageDiv);

      let overflow = false;

      for (let j = i; j < allBlocks.length; j++) {
        const clone = allBlocks[j].cloneNode(true) as HTMLElement;
        pageDiv.appendChild(clone);

        if (pageDiv.scrollHeight > pageHeight && j > i) {
          pageDiv.removeChild(clone);
          i = j;
          overflow = true;
          break;
        }
      }

      if (!overflow) {
        i = allBlocks.length;
      }

      result.push(pageDiv.innerHTML);
      pageDiv.remove();
    }

    if (result.length === 0) {
      result.push(props.html);
    }

    setPages(result);
    measurer.innerHTML = "";
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
            style={
              {
                background: themeColors().bgColor,
                color: themeColors().textColor,
                "--reader-h-padding": `${settings().hPadding}rem`,
              } as unknown as Record<string, string>
            }
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
                  fontSize: `${settings().fontSize}%`,
                  lineHeight: `${settings().lineHeight}`,
                  paddingTop: "1rem",
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
