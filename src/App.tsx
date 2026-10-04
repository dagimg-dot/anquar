import { useLocation, useNavigate, useParams } from "@solidjs/router";
import {
	createEffect,
	createSignal,
	Match,
	onMount,
	Show,
	Switch,
} from "solid-js";
import AddSheet from "./components/AddSheet.tsx";
import AppHeader from "./components/AppHeader.tsx";
import AppleToaster from "./components/AppleToaster.tsx";
import BottomNav from "./components/BottomNav.tsx";
import ChangelogSheet from "./components/ChangelogSheet.tsx";
import Feed from "./components/Feed.tsx";
import ImportSheet from "./components/ImportSheet.tsx";
import Sidebar from "./components/Sidebar.tsx";
import { lastOpenedBook } from "./lib/db.ts";
import { importShared } from "./lib/imports.ts";
import { ReaderSettingsProvider } from "./lib/reader-settings.tsx";
import { bookPath, HOME, isBookPath } from "./lib/routes.ts";
import { useShellKeys } from "./lib/shell-keys.ts";
import { type TabId, tabLabel } from "./lib/tabs.ts";
import { switchTab } from "./lib/transitions.ts";
import FeedPage from "./pages/Feed.tsx";
import Library from "./pages/Library.tsx";
import Saved from "./pages/Saved.tsx";
import SettingsTab from "./pages/SettingsTab.tsx";

// Outside App, which the router mounts afresh for the tabs and for a book: back from a book returns to the tab
// it was opened from.
const [activeTab, setActiveTab] = createSignal<TabId>("feed");

// On a wide screen the tabs sit beside a sidebar; the reader has the whole window.
const SHELL =
	"tablet:grid tablet:grid-cols-[4.875rem_minmax(0,1fr)] desktop:grid-cols-[14.75rem_minmax(0,1fr)]";

const viewport = document.querySelector<HTMLMetaElement>(
	'meta[name="viewport"]',
);
const zoomable = viewport?.content ?? "";

function App() {
	const params = useParams();
	const location = useLocation();
	const navigate = useNavigate();
	const [main, setMain] = createSignal<HTMLElement>();

	const isReaderPage = () => isBookPath(location.pathname);
	const bookId = () => params.id || null;

	const openTab = (tab: TabId) =>
		tab !== activeTab() && switchTab(() => setActiveTab(tab));
	useShellKeys(openTab, () => !isReaderPage());

	// Pinch zoom is for reading: only the reader lets the page scale.
	createEffect(() => {
		viewport?.setAttribute(
			"content",
			isReaderPage()
				? zoomable
				: `${zoomable}, maximum-scale=1, user-scalable=no`,
		);
	});

	// A book shared to anquar from another app arrives as a redirect to "/app/?shared", with the files left in
	// the service worker's cache.
	onMount(() => {
		if (!new URLSearchParams(location.search).has("shared")) return;
		navigate(HOME, { replace: true });
		void importShared();
	});

	// Continue reading, the shortcut on the app's icon, opens "/app/?continue": straight into the book read last,
	// or home when none has been opened. Home waits for the answer, so the splash lands only once.
	const [continuing, setContinuing] = createSignal(
		new URLSearchParams(location.search).has("continue"),
	);
	onMount(async () => {
		if (!continuing()) return;
		const book = await lastOpenedBook();
		navigate(book ? bookPath(book.id) : HOME, { replace: true });
		setContinuing(false);
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

			<div classList={{ [SHELL]: !isReaderPage() }}>
				<Show when={!isReaderPage()}>
					<Sidebar activeTab={activeTab()} onSelect={openTab} />
				</Show>

				<main
					ref={setMain}
					class="h-dvh"
					classList={{
						"overflow-hidden": isReaderPage(),
						"overflow-y-auto": !isReaderPage(),
					}}
				>
					<Show
						fallback={
							<>
								<AppHeader title={tabLabel(activeTab())} />
								{/* What fades when the tab changes; the header and the tab bar stay (lib/transitions.ts). */}
								<div class="page-column" data-tab-content>
									<Switch>
										<Match when={activeTab() === "feed" && !continuing()}>
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
								</div>
							</>
						}
						when={isReaderPage() && bookId()}
					>
						<ReaderSettingsProvider bookId={bookId() as string}>
							<Feed />
						</ReaderSettingsProvider>
					</Show>
				</main>
			</div>

			<Show when={!isReaderPage()}>
				<BottomNav
					activeTab={activeTab()}
					scroller={main}
					setActiveTab={openTab}
				/>
			</Show>
			<ImportSheet />
			<AddSheet />
			<ChangelogSheet />
			<AppleToaster />
		</div>
	);
}

export default App;
