import { createSignal, onCleanup, onMount } from "solid-js";

const TITLES = [
  "The Midnight Library",
  "Project Hail Mary",
  "Klara and the Sun",
  "Piranesi",
  "The Invisible Life of Addie LaRue",
  "Circe",
  "The Song of Achilles",
  "An Alchemy of Masques and Mirrors",
  "The Name of the Wind",
  "The Way of Kings",
  "Mistborn: The Final Empire",
  "A Court of Thorns and Roses",
  "The Poppy War",
  "Empire of the Vampire",
  "The Bone Ships",
  "The Traitor Baru Cormorant",
  "The Fifth Season",
  "The Goblin Emperor",
  "The Long Way to a Small, Angry Planet",
  "A Psalm for the Wild-Built",
];

const AUTHORS = [
  "Matt Haig",
  "Andy Weir",
  "Kazuo Ishiguro",
  "Susanna Clarke",
  "V.E. Schwab",
  "Madeline Miller",
  "Madeline Miller",
  "A.R. Capetta",
  "Patrick Rothfuss",
  "Brandon Sanderson",
  "Brandon Sanderson",
  "Sarah J. Maas",
  "R.F. Kuang",
  "Gabriel Kenny-Rhoades",
  "Josiah Bancroft",
  "Seth Dickinson",
  "N.K. Jemisin",
  "Martha Wells",
  "Becky Chambers",
  "Becky Chambers",
];

const COVER_COLORS = [
  "from-indigo-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-cyan-500 to-blue-600",
  "from-fuchsia-500 to-pink-600",
  "from-lime-500 to-green-600",
  "from-violet-500 to-indigo-600",
];

function generateBook(id: number) {
  const idx = id % TITLES.length;
  return {
    id,
    title: TITLES[idx],
    author: AUTHORS[idx],
    excerpt:
      "The story unfolds with breathtaking prose, weaving together themes of loss, wonder, and the quiet courage it takes to keep going when the world feels impossible.",
    coverClass: COVER_COLORS[idx % COVER_COLORS.length],
  };
}

export default function Feed() {
  const [books, setBooks] = createSignal(
    Array.from({ length: 10 }, (_, i) => generateBook(i))
  );

  // biome-ignore lint/suspicious/noUnassignedVariables: assigned by ref
  let sentinel: HTMLDivElement | undefined;

  function loadMore() {
    setBooks((prev) => {
      const start = prev.length;
      return [
        ...prev,
        ...Array.from({ length: 5 }, (_, i) => generateBook(start + i)),
      ];
    });
  }

  onMount(() => {
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="relative space-y-4">
      <div class="pointer-events-none fixed inset-0 overflow-hidden">
        <div class="orb orb-1 absolute top-20 left-10" />
        <div class="orb orb-2 absolute top-60 right-10" />
        <div class="orb orb-3 absolute bottom-40 left-1/3" />
      </div>

      {books().map((book) => (
        <article class="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          <div
            class={`h-48 bg-gradient-to-br ${book.coverClass} flex items-end p-4`}
          >
            <span class="rounded-lg bg-black/30 px-3 py-1 font-medium text-sm text-white backdrop-blur-sm">
              Chapter {book.id + 1}
            </span>
          </div>
          <div class="p-4">
            <h2 class="font-bold text-ink text-lg">{book.title}</h2>
            <p class="mt-1 text-ink-soft text-sm">{book.author}</p>
            <p class="mt-3 text-ink-soft text-sm leading-relaxed">
              {book.excerpt}
            </p>
          </div>
        </article>
      ))}
      <div class="h-4" ref={sentinel} />
    </div>
  );
}
