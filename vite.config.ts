import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import solid from "vite-plugin-solid";

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
		VitePWA({
			registerType: "prompt",
			injectRegister: false,
			pwaAssets: {
				disabled: false,
				config: true,
				htmlPreset: "2023",
				overrideManifestIcons: true,
			},
			manifest: {
				name: "BukTok",
				short_name: "BukTok",
				description: "Guilt-free doomscrolling — books in a TikTok-style feed",
				theme_color: "#ffffff",
				background_color: "#ffffff",
				display: "standalone",
				scope: "/",
				start_url: "/",
				icons: [
					{ src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
					{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
					{ src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
					{
						src: "maskable-icon-512x512.png",
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
