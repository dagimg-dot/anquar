import BottomNav from "./components/BottomNav.tsx";
import PWABadge from "./PWABadge.tsx";

function App() {
  return (
    <div class="min-h-screen bg-canvas text-ink">
      <main class="mx-auto max-w-lg px-4 pt-8 pb-24">
        <h1 class="font-bold text-3xl text-brand-500">Hello from buktok</h1>
      </main>
      <BottomNav />
      <PWABadge />
    </div>
  );
}

export default App;
