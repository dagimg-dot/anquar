import { createSignal, Show } from "solid-js";
import AppleToaster from "./components/AppleToaster.tsx";
import BottomNav from "./components/BottomNav.tsx";
import Feed from "./components/Feed.tsx";
import FilePicker from "./components/FilePicker.tsx";
import ReaderSettingsPanel from "./components/ReaderSettingsPanel.tsx";
import PWABadge from "./PWABadge.tsx";

function App() {
  const [bookId, setBookId] = createSignal<string | null>(null);
  const [showSettings, setShowSettings] = createSignal(false);

  return (
    <div class="min-h-screen bg-canvas text-ink">
      <svg aria-hidden="true" class="hidden">
        <defs>
          <filter id="liquid-glass-refraction">
            <feTurbulence
              baseFrequency="0.015"
              numOctaves="2"
              result="noise"
              seed="2"
              type="fractalNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="3"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <main class="h-dvh overflow-hidden">
        <Show
          fallback={<FilePicker onBookLoaded={(id) => setBookId(id)} />}
          when={bookId()}
        >
          <Feed />
        </Show>
      </main>

      {/* Reader settings panel */}
      <div
        class="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-md px-4 transition-all duration-200"
        classList={{
          "translate-y-0 opacity-100": showSettings(),
          "translate-y-4 opacity-0 pointer-events-none": !showSettings(),
        }}
      >
        <Show when={showSettings()}>
          <ReaderSettingsPanel />
        </Show>
      </div>

      {/* Settings toggle button (only visible while reading) */}
      <Show when={bookId()}>
        <button
          aria-label="Toggle reading settings"
          class="fixed right-6 bottom-28 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-ink shadow-lg transition-colors hover:bg-brand-500 hover:text-white"
          onClick={() => setShowSettings((p) => !p)}
          type="button"
        >
          <span class="font-semibold text-sm">Aa</span>
        </button>
      </Show>

      <BottomNav />
      <AppleToaster />
      <PWABadge />
    </div>
  );
}

export default App;
