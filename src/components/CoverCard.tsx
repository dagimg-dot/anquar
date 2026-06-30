import { BookOpen } from "phosphor-solid";
import { Show } from "solid-js";

interface CoverCardProps {
  author: string;
  chapterCount: number;
  coverImage?: string | null;
  onStartReading?: () => void;
  title: string;
}

export default function CoverCard(props: CoverCardProps) {
  return (
    <div class="flex min-h-[80svh] flex-col items-center justify-center gap-6 px-4">
      <Show
        fallback={
          <div class="flex h-64 w-44 items-center justify-center rounded-2xl bg-surface shadow-xl">
            <BookOpen class="h-16 w-16 text-ink-soft" size={64} />
          </div>
        }
        when={props.coverImage}
      >
        <img
          alt={props.title}
          class="h-64 w-44 rounded-2xl object-cover shadow-xl"
          height={256}
          src={props.coverImage ?? ""}
          width={176}
        />
      </Show>

      <div class="text-center">
        <h1 class="font-bold text-2xl text-ink">{props.title}</h1>
        <p class="mt-2 text-ink-soft">{props.author}</p>
        <p class="mt-1 text-ink-soft text-sm">{props.chapterCount} chapters</p>
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
