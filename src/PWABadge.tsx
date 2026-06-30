import { useRegisterSW } from "virtual:pwa-register/solid";
import { Show } from "solid-js";

function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, _r) {
      console.log("SW registered");
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });

  function close() {
    setOfflineReady(false);
    setNeedRefresh(false);
  }

  return (
    <Show when={offlineReady() || needRefresh()}>
      <div
        class="fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg"
        role="alert"
      >
        <div class="flex-1">
          <Show
            fallback={<span>New content available.</span>}
            when={offlineReady()}
          >
            <span>App ready to work offline</span>
          </Show>
        </div>
        <Show when={needRefresh()}>
          <button
            class="rounded bg-white px-3 py-1 font-medium text-gray-900 text-sm hover:bg-gray-100"
            onClick={() => updateServiceWorker(true)}
            type="button"
          >
            Reload
          </button>
        </Show>
        <button
          aria-label="Close"
          class="text-gray-400 hover:text-white"
          onClick={close}
          type="button"
        >
          ✕
        </button>
      </div>
    </Show>
  );
}

export default PWABadge;
