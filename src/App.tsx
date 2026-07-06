import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { CaretLeft, GearSix } from "phosphor-solid";
import { createSignal, Match, Show, Switch } from "solid-js";
import toast from "solid-toast";
import AppleToaster from "./components/AppleToaster.tsx";
import BottomNav from "./components/BottomNav.tsx";
import Feed from "./components/Feed.tsx";
import ReaderSettingsPanel from "./components/ReaderSettingsPanel.tsx";
import { extractCssMeta } from "./epub-renderer/css-meta.ts";
import { parseChapter } from "./epub-renderer/parser.ts";
import { saveBook } from "./lib/db.ts";
import { useEpubParser } from "./lib/epub.ts";
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
	const [showHud, setShowHud] = createSignal(false);
	const [showSettings, setShowSettings] = createSignal(false);
	const [activeTab, setActiveTab] = createSignal("feed");

	const isReaderPage = () => location.pathname.startsWith("/book/");
	const bookId = () => params.id || null;

	let fabInputRef: HTMLInputElement | undefined;
	const { parse } = useEpubParser();

	async function handleFabImport(file: File) {
		if (!file.name.endsWith(".epub")) return;
		try {
			const result = await parse(file);
			const chaptersWithBlocks = result.chapters.map((ch) => ({
				...ch,
				blocks: parseChapter(ch.html ?? ""),
			}));
			let cssMeta: import("./epub-renderer/types.ts").EpubCssMeta | undefined;
			if (result.firstHtml && result.allCssTexts) {
				const doc = new DOMParser().parseFromString(
					result.firstHtml,
					"text/html",
				);
				cssMeta = extractCssMeta(result.allCssTexts, doc);
			}
			const bookId = await saveBook(
				result.metadata,
				chaptersWithBlocks,
				result.toc,
				result.coverImage ?? undefined,
				cssMeta,
			);
			toast.success(`${result.metadata.title} imported successfully`);
			navigate(`/book/${bookId}`);
		} catch (err) {
			console.error("Import failed:", err);
		}
	}

	function onFabFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			handleFabImport(file);
			input.value = "";
		}
	}

	function handleScreenTap(e: MouseEvent) {
		const x = e.clientX;
		const w = window.innerWidth;
		const middleThird = x > w / 3 && x < (w * 2) / 3;
		if (middleThird) {
			setShowHud((p) => !p);
			if (showSettings()) {
				setShowSettings(false);
			}
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
						{/* biome-ignore lint/a11y/useSemanticElements: tap zone for hud */}
						{/* biome-ignore lint/a11y/useFocusableInteractive: intentionally not focusable */}
						<div
							class="h-dvh"
							onClick={handleScreenTap}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									setShowHud((p) => !p);
								}
							}}
							role="button"
							tabindex={-1}
						>
							<Feed />

							{/* HUD overlay */}
							<Show when={showHud()}>
								{/* Back button - top left */}
								<button
									aria-label="Back to library"
									class="fixed top-4 left-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-surface/80 text-ink shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-surface active:scale-90"
									onClick={(e) => {
										e.stopPropagation();
										navigate("/");
									}}
									type="button"
								>
									<CaretLeft size={20} weight="bold" />
								</button>

								{/* Settings icon - bottom right */}
								<button
									aria-label="Reading settings"
									class="fixed right-4 bottom-24 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-surface/80 text-ink shadow-lg backdrop-blur-sm transition-all duration-300 hover:bg-surface active:scale-90"
									onClick={(e) => {
										e.stopPropagation();
										setShowSettings((p) => !p);
									}}
									type="button"
								>
									<GearSix size={24} weight="bold" />
								</button>
							</Show>

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
				<BottomNav activeTab={activeTab()} setActiveTab={setActiveTab} />
			</Show>
			<Show when={!isReaderPage() && activeTab() === "feed"}>
				<input
					type="file"
					accept=".epub"
					class="hidden"
					ref={fabInputRef}
					onChange={onFabFileChange}
				/>
				<button
					class="fixed right-4 bottom-24 z-40 flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-white shadow-lg cursor-pointer border-none transition-all duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92]"
					onClick={() => fabInputRef?.click()}
					type="button"
				>
					+
				</button>
			</Show>
			<AppleToaster />
			<PWABadge />
		</div>
	);
}

export default App;
