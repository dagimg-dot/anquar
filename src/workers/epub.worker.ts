import { initEpubFile } from "@lingo-reader/epub-parser";
import JSZip from "jszip";
import { extractCssMeta } from "../epub-renderer/css-meta.ts";
import { parseChapter } from "../epub-renderer/parser.ts";
import type { WorkerMessage, WorkerResponse } from "../lib/types.ts";
import { extractCoverImage } from "./cover.ts";
import { resolveCss } from "./css.ts";
import { resolveImagesInHtml } from "./images.ts";

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const { type } = event.data;

	if (type === "ABORT") {
		self.close();
		return;
	}

	const { file } = event.data;

	try {
		const epub = await initEpubFile(file);
		const zip = await JSZip.loadAsync(file);

		const metadata = epub.getMetadata();
		const spine = epub.getSpine();
		const toc = epub.getToc();
		const coverImage = await extractCoverImage(epub, zip);

		const allCssTexts: string[] = [];

		const chapters = await Promise.all(
			spine
				.filter((item) => item.linear !== "no")
				.map(async (item, index) => {
					const { html, css } = await epub.loadChapter(item.id);
					const resolvedCss = await resolveCss(css);
					const resolvedHtml = await resolveImagesInHtml(html);

					// Collect CSS texts for metadata extraction
					for (const sheet of resolvedCss) {
						allCssTexts.push(sheet.href);
					}

					// Parse HTML into structured blocks
					const blocks = parseChapter(resolvedHtml);

					return {
						id: item.id,
						order: index,
						blocks,
						css: resolvedCss,
					};
				}),
		);

		// Extract CSS metadata from the first chapter's HTML
		let cssMeta: import("../epub-renderer/types.ts").EpubCssMeta | undefined;
		if (chapters.length > 0) {
			const firstSpine = spine.find((item) => item.linear !== "no");
			if (firstSpine) {
				const { html } = await epub.loadChapter(firstSpine.id);
				const resolvedHtml = await resolveImagesInHtml(html);
				const doc = new DOMParser().parseFromString(resolvedHtml, "text/html");
				cssMeta = extractCssMeta(allCssTexts, doc);
			}
		}

		epub.destroy();

		const response: WorkerResponse = {
			type: "COMPLETE",
			payload: {
				metadata: {
					title: metadata.title,
					author: metadata.creator?.[0]?.contributor ?? "Unknown",
					language: metadata.language,
					description: metadata.description,
					publisher: metadata.publisher,
				},
				spine: spine.map((item) => ({
					id: item.id,
					href: item.href,
					mediaType: item.mediaType,
					linear: item.linear,
				})),
				toc: toc.map((entry) => ({
					label: entry.label,
					href: entry.href,
					id: entry.id,
					children: entry.children?.map((child) => ({
						label: child.label,
						href: child.href,
						id: child.id,
					})),
				})),
				chapters,
				coverImage,
				cssMeta,
			},
		};

		self.postMessage(response);
	} catch (err) {
		const response: WorkerResponse = {
			type: "ERROR",
			error: err instanceof Error ? err.message : "Unknown error",
		};
		self.postMessage(response);
	}
};
