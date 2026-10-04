import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { type Connect, defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";
import { GROUND, INK, markSvgLines, SPLASH_BOX } from "./src/brand/mark.ts";
import {
	IOS_SCREENS,
	startupImage,
	startupMedia,
} from "./src/brand/startup.ts";
import { RELEASES } from "./src/lib/changelog.ts";

function manifestContentType(): Plugin {
	return {
		name: "manifest-content-type",
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url?.endsWith(".webmanifest")) {
					res.setHeader("Content-Type", "application/manifest+json");
				}
				next();
			});
		},
	};
}

// The app lives under /app/, and every path there without a file in it is one of its own routes (a book),
// so it gets the app's page, as netlify.toml does once deployed.
function appRoutes(): Plugin {
	const toApp: Connect.NextHandleFunction = (req, _res, next) => {
		const [path, query] = (req.url ?? "").split("?");
		if (/^\/app(\/[^.]*)?$/.test(path) && path !== "/app/index.html")
			req.url = `/app/index.html${query ? `?${query}` : ""}`;
		next();
	};
	return {
		name: "app-routes",
		configureServer: (server) => void server.middlewares.use(toApp),
		configurePreviewServer: (server) => void server.middlewares.use(toApp),
	};
}

// The splash's first frame has to be in app/index.html, painted before the bundle loads, so the mark, its
// colours and size, and the iOS startup images are written into it from src/brand.
function brandHtml(): Plugin {
	return {
		name: "brand-html",
		transformIndexHtml(html) {
			const startup = IOS_SCREENS.map(
				(s) =>
					`<link rel="apple-touch-startup-image" media="${startupMedia(s)}" href="/${startupImage(s)}">`,
			).join("\n    ");
			return html
				.replace("<!--mark-->", markSvgLines())
				.replace("<!--apple-startup-->", startup)
				.replaceAll("__GROUND__", GROUND)
				.replaceAll("__INK__", INK)
				.replace("__SPLASH_BOX__", SPLASH_BOX.toFixed(2));
		},
	};
}

// The changelog as a file beside the app, left out of the precache, so a copy of the app still running an
// older version can read what the waiting one brings (src/lib/update.ts).
function changelogFile(): Plugin {
	const json = JSON.stringify(RELEASES);
	return {
		name: "changelog-file",
		configureServer(server) {
			server.middlewares.use("/app/changelog.json", (_req, res) => {
				res.setHeader("Content-Type", "application/json");
				res.end(json);
			});
		},
		generateBundle() {
			this.emitFile({
				type: "asset",
				fileName: "app/changelog.json",
				source: json,
			});
		},
	};
}

export default defineConfig({
	appType: "mpa",
	build: {
		rollupOptions: {
			input: {
				landing: fileURLToPath(new URL("index.html", import.meta.url)),
				app: fileURLToPath(new URL("app/index.html", import.meta.url)),
			},
		},
	},
	resolve: {
		conditions: ["browser"],
		mainFields: ["browser", "module", "main"],
	},
	server: {
		forwardConsole: {
			unhandledErrors: true,
			logLevels: ["error", "warn"],
		},
	},
	plugins: [
		tailwindcss(),
		solid(),
		manifestContentType(),
		appRoutes(),
		brandHtml(),
		changelogFile(),
		VitePWA({
			registerType: "prompt",
			injectRegister: false,
			scope: "/app/",
			// Android draws its splash from background_color and the maskable icon, whose ground is the same
			// colour, and keeps theme_color in the status bar: both are the dark canvas, so the launch, the
			// splash and the Feed tab are one surface.
			manifest: {
				id: "/app/",
				name: "anquar",
				short_name: "anquar",
				description: "Guilt-free bookscrolling: books as a vertical feed",
				theme_color: GROUND,
				background_color: GROUND,
				display: "standalone",
				scope: "/app/",
				start_url: "/app/",
				// Share → anquar from other apps; public/share-target.js takes the post.
				share_target: {
					action: "/app/share-target",
					method: "POST",
					enctype: "multipart/form-data",
					params: {
						files: [
							{ name: "books", accept: ["application/epub+zip", ".epub"] },
						],
					},
				},
				// Long-pressing the app's icon offers Continue reading; App.tsx opens the book read last.
				shortcuts: [
					{
						name: "Continue reading",
						short_name: "Continue",
						url: "/app/?continue",
						icons: [
							{
								src: "icons/maskable-192x192.png",
								sizes: "192x192",
								type: "image/png",
								purpose: "maskable",
							},
						],
					},
				],
				icons: [
					{
						src: "icons/pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "icons/pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "icons/maskable-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "icons/maskable-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			// Only the app is cached for offline use: the landing page and its own code stay out, so changing
			// the page at / never offers the installed app an update.
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
				globIgnores: [
					"share-target.js",
					"push.js",
					"index.html",
					"assets/landing-*",
					"landing/**",
					"og/**",
				],
				importScripts: ["share-target.js", "push.js"],
				navigateFallback: "/app/index.html",
				navigateFallbackAllowlist: [/^\/app\//],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
			},
			devOptions: {
				enabled: false,
				navigateFallback: "app/index.html",
				suppressWarnings: true,
				type: "module",
			},
		}),
	],
});
