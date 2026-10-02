import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";
import { GROUND, INK, markSvgLines, SPLASH_BOX } from "./src/brand/mark.ts";
import {
	IOS_SCREENS,
	startupImage,
	startupMedia,
} from "./src/brand/startup.ts";

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

// The splash's first frame has to be in index.html, painted before the bundle loads, so the mark, its
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

export default defineConfig({
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
		brandHtml(),
		VitePWA({
			registerType: "prompt",
			injectRegister: false,
			// Android draws its splash from background_color and the maskable icon, whose ground is the same
			// colour, and keeps theme_color in the status bar: both are the dark canvas, so the launch, the
			// splash and the Feed tab are one surface.
			manifest: {
				id: "/",
				name: "Anquar",
				short_name: "Anquar",
				description: "Guilt-free doomscrolling — books in a TikTok-style feed",
				theme_color: GROUND,
				background_color: GROUND,
				display: "standalone",
				scope: "/",
				start_url: "/",
				// Share → Anquar from other apps; public/share-target.js takes the post.
				share_target: {
					action: "/share-target",
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
						url: "/?continue",
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
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
				globIgnores: ["share-target.js"],
				importScripts: ["share-target.js"],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
			},
			devOptions: {
				enabled: false,
				navigateFallback: "index.html",
				suppressWarnings: true,
				type: "module",
			},
		}),
	],
});
