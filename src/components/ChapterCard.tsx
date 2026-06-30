import { onCleanup, onMount, Show } from "solid-js";

interface ChapterCardProps {
  css: Array<{ id: string; href: string }>;
  html: string;
  title?: string;
}

export default function ChapterCard(props: ChapterCardProps) {
  // biome-ignore lint/suspicious/noUnassignedVariables: assigned by ref
  let ref: HTMLDivElement | undefined;

  onMount(() => {
    if (!ref) {
      return;
    }

    const styles: HTMLStyleElement[] = [];

    Promise.all(
      props.css.map(async (sheet) => {
        try {
          const response = await fetch(sheet.href);
          const cssText = await response.text();
          const style = document.createElement("style");
          style.textContent = cssText;
          ref?.appendChild(style);
          styles.push(style);
        } catch {
          // CSS load failed, continue
        }
      })
    );

    onCleanup(() => {
      for (const style of styles) {
        style.remove();
      }
    });
  });

  return (
    <div class="min-h-[80svh] overflow-y-auto px-4 py-8">
      <Show when={props.title}>
        <h2 class="mb-6 font-bold text-ink text-xl">{props.title}</h2>
      </Show>
      <div
        class="prose prose-ink max-w-none"
        innerHTML={props.html}
        ref={ref}
      />
    </div>
  );
}
