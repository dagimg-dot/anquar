import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";
import { GROUND } from "./src/brand/mark.ts";
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

// index.html takes its colours and the iOS startup images from src/brand.
function brandHtml(): Plugin {
	return {
		name: "brand-html",
		transformIndexHtml(html) {
			const startup = IOS_SCREENS.map(
				(s) =>
					`<link rel="apple-touch-startup-image" media="${startupMedia(s)}" href="/${startupImage(s)}">`,
			).join("\n    ");
			return html
				.replace("<!--apple-startup-->", startup)
				.replaceAll("__GROUND__", GROUND);
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
				globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
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
