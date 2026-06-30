import BottomNav from "./components/BottomNav.tsx";
import Feed from "./components/Feed.tsx";
import PWABadge from "./PWABadge.tsx";

function App() {
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

      <main class="mx-auto max-w-lg px-4 pt-8 pb-24">
        <Feed />
      </main>
      <BottomNav />
      <PWABadge />
    </div>
  );
}

export default App;
