import { onCleanup, onMount, Show } from "solid-js";
import { useReaderSettings } from "../lib/reader-settings.tsx";

interface ChapterCardProps {
  css: Array<{ id: string; href: string }>;
  html: string;
  title?: string;
}

export default function ChapterCard(props: ChapterCardProps) {
  // biome-ignore lint/suspicious/noUnassignedVariables: assigned by ref
  let ref: HTMLDivElement | undefined;
  const { settings } = useReaderSettings();

  onMount(() => {
    if (!ref) {
      return;
    }

    const styles: HTMLStyleElement[] = [];

    for (const sheet of props.css) {
      const style = document.createElement("style");
      style.textContent = sheet.href;
      ref.appendChild(style);
      styles.push(style);
    }

    onCleanup(() => {
      for (const style of styles) {
        style.remove();
      }
    });
  });

  return (
    <div
      class="snap-page flex h-dvh flex-col overflow-hidden"
      style={{
        "--reader-font-size": `${settings().fontSize}%`,
        "--reader-line-height": `${settings().lineHeight}`,
        "--reader-h-padding": `${settings().hPadding}rem`,
        "padding-left": `${settings().hPadding}rem`,
        "padding-right": `${settings().hPadding}rem`,
      }}
    >
      <Show when={props.title}>
        <h2 class="shrink-0 px-6 pt-6 pb-2 font-bold text-ink text-xl">
          {props.title}
        </h2>
      </Show>
      <div
        class="min-h-0 flex-1 overflow-y-auto py-4"
        classList={{
          "pt-6": !props.title,
        }}
      >
        <div
          class="reader-content prose prose-ink max-w-none"
          innerHTML={props.html}
          ref={ref}
        />
      </div>
    </div>
  );
}
