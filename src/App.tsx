import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { CaretLeft } from "phosphor-solid";
import { createSignal, Show } from "solid-js";
import AppleToaster from "./components/AppleToaster.tsx";
import BottomNav from "./components/BottomNav.tsx";
import Feed from "./components/Feed.tsx";
import FilePicker from "./components/FilePicker.tsx";
import ReaderSettingsPanel from "./components/ReaderSettingsPanel.tsx";
import { ReaderSettingsProvider } from "./lib/reader-settings.tsx";
import PWABadge from "./PWABadge.tsx";

function App() {
	const params = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const [showSettings, setShowSettings] = createSignal(false);

	const isReaderPage = () => location.pathname.startsWith("/book/");
	const bookId = () => params.id || null;

	function handleScreenTap(e: MouseEvent) {
		const x = e.clientX;
		const w = window.innerWidth;
		const middleThird = x > w / 3 && x < (w * 2) / 3;
		if (middleThird) {
			setShowSettings((p) => !p);
		}
	}

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
				<Show fallback={<FilePicker />} when={isReaderPage() && bookId()}>
					<ReaderSettingsProvider bookId={bookId() as string}>
						{/* biome-ignore lint/a11y/useSemanticElements: tap zone for settings */}
						{/* biome-ignore lint/a11y/useFocusableInteractive: intentionally not focusable */}
						<div
							class="h-dvh"
							onClick={handleScreenTap}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									setShowSettings((p) => !p);
								}
							}}
							role="button"
							tabindex={-1}
						>
							<Feed />

							{/* Back button - top left */}
							<button
								aria-label="Back to library"
								class="fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-ink shadow-lg backdrop-blur-sm transition-colors hover:bg-surface"
								onClick={(e) => {
									e.stopPropagation();
									navigate("/");
								}}
								type="button"
							>
								<CaretLeft size={20} weight="bold" />
							</button>

							{/* Settings panel */}
							<div
								class="fixed inset-x-0 bottom-24 z-40 mx-auto max-w-md px-4 transition-all duration-200"
								classList={{
									"translate-y-0 opacity-100": showSettings(),
									"translate-y-4 opacity-0 pointer-events-none":
										!showSettings(),
								}}
							>
								<Show when={showSettings()}>
									<ReaderSettingsPanel />
								</Show>
							</div>
						</div>
					</ReaderSettingsProvider>
				</Show>
			</main>

			<Show when={!isReaderPage()}>
				<BottomNav />
			</Show>
			<AppleToaster />
			<PWABadge />
		</div>
	);
}

export default App;
