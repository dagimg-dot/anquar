import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { createSignal, Match, onMount, Show, Switch } from "solid-js";
import AppleToaster from "./components/AppleToaster.tsx";
import BottomNav from "./components/BottomNav.tsx";
import Feed from "./components/Feed.tsx";
import ImportSheet from "./components/ImportSheet.tsx";
import { importShared, pickBooks } from "./lib/imports.ts";
import { ReaderSettingsProvider } from "./lib/reader-settings.tsx";
import PWABadge from "./PWABadge.tsx";
import FeedPage from "./pages/Feed.tsx";
import Library from "./pages/Library.tsx";
import Saved from "./pages/Saved.tsx";
import SettingsTab from "./pages/SettingsTab.tsx";

function App() {
	const params = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = createSignal("feed");

	const isReaderPage = () => location.pathname.startsWith("/book/");
	const bookId = () => params.id || null;

	// A book shared to Anquar from another app arrives as a redirect to "/?shared", with the files left in
	// the service worker's cache.
	onMount(() => {
		if (!new URLSearchParams(location.search).has("shared")) return;
		navigate("/", { replace: true });
		void importShared();
	});

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

			<main
				class="h-dvh"
				classList={{
					"overflow-hidden": isReaderPage(),
					"overflow-y-auto": !isReaderPage(),
				}}
			>
				<Show
					fallback={
						<Switch>
							<Match when={activeTab() === "feed"}>
								<FeedPage />
							</Match>
							<Match when={activeTab() === "library"}>
								<Library />
							</Match>
							<Match when={activeTab() === "saved"}>
								<Saved />
							</Match>
							<Match when={activeTab() === "settings"}>
								<SettingsTab />
							</Match>
						</Switch>
					}
					when={isReaderPage() && bookId()}
				>
					<ReaderSettingsProvider bookId={bookId() as string}>
						<Feed />
					</ReaderSettingsProvider>
				</Show>
			</main>

			<Show when={!isReaderPage()}>
				<BottomNav activeTab={activeTab()} setActiveTab={setActiveTab} />
			</Show>
			<Show when={!isReaderPage() && activeTab() === "feed"}>
				<button
					class="fixed right-4 bottom-22 z-40 flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg cursor-pointer border-none transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92]"
					onClick={pickBooks}
					type="button"
					aria-label="Import EPUB"
					data-splash-slide
				>
					<svg
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2.5"
						class="h-6 w-6"
						aria-hidden="true"
					>
						<path d="M12 4v16m-8-8h16" />
					</svg>
				</button>
			</Show>
			<ImportSheet />
			<AppleToaster />
			<PWABadge />
		</div>
	);
}

export default App;
