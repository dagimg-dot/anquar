import { initEpubFile } from "@lingo-reader/epub-parser";
import JSZip from "jszip";
import type { WorkerMessage, WorkerResponse } from "../lib/types.ts";

const IMG_SRC_REGEX = /src="([^"]+)"/;

function uint8ArrayToDataUrl(bytes: Uint8Array, mimeType: string): string {
  const base64 = btoa(
    Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join("")
  );
  return `data:${mimeType};base64,${base64}`;
}

async function extractCoverFromManifest(
  epub: Awaited<ReturnType<typeof initEpubFile>>,
  zip: JSZip
): Promise<string | null> {
  const manifest = epub.getManifest();

  for (const [, item] of Object.entries(manifest)) {
    if (!item.properties?.includes("cover-image")) {
      continue;
    }

    if (item.mediaType.startsWith("image/")) {
      const entry = zip.file(item.href);
      if (entry) {
        const bytes = await entry.async("uint8array");
        return uint8ArrayToDataUrl(bytes, item.mediaType);
      }
    }

    try {
      const { html } = await epub.loadChapter(item.id);
      const imgMatch = html.match(IMG_SRC_REGEX);
      if (imgMatch) {
        const imgPath = imgMatch[1];
        const imgEntry = Object.values(manifest).find(
          (m) => m.href === imgPath || m.href.endsWith(imgPath)
        );
        if (imgEntry) {
          const entry = zip.file(imgEntry.href);
          if (entry) {
            const bytes = await entry.async("uint8array");
            return uint8ArrayToDataUrl(bytes, imgEntry.mediaType);
          }
        }
      }
    } catch {
      // Chapter load failed
    }
    break;
  }

  const metadata = epub.getMetadata();
  const coverMetaId = metadata.metas?.cover;
  if (coverMetaId && manifest[coverMetaId]) {
    const coverItem = manifest[coverMetaId];
    if (coverItem.mediaType.startsWith("image/")) {
      const entry = zip.file(coverItem.href);
      if (entry) {
        const bytes = await entry.async("uint8array");
        return uint8ArrayToDataUrl(bytes, coverItem.mediaType);
      }
    }
  }

  return null;
}

async function extractCoverFromGuide(
  epub: Awaited<ReturnType<typeof initEpubFile>>
): Promise<string | null> {
  const coverUrl = epub.getCoverImage();
  if (!coverUrl) {
    return null;
  }

  try {
    const response = await fetch(coverUrl);
    const contentType = response.headers.get("content-type");
    if (contentType?.startsWith("image/")) {
      const blob = await response.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      return uint8ArrayToDataUrl(bytes, contentType);
    }
  } catch {
    // Fallback failed
  }

  return null;
}

async function extractCoverImage(
  epub: Awaited<ReturnType<typeof initEpubFile>>,
  file: File
): Promise<string | null> {
  const zip = await JSZip.loadAsync(file);
  return (
    (await extractCoverFromManifest(epub, zip)) ??
    (await extractCoverFromGuide(epub))
  );
}

function resolveCss(
  css: Array<{ id: string; href: string }>
): Promise<Array<{ id: string; href: string }>> {
  return Promise.all(
    css.map(async (sheet) => ({
      id: sheet.id,
      href: await (async () => {
        try {
          const response = await fetch(sheet.href);
          return response.text();
        } catch {
          return "";
        }
      })(),
    }))
  );
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;

  if (type === "ABORT") {
    self.close();
    return;
  }

  const { file } = event.data;

  try {
    const epub = await initEpubFile(file);

    const metadata = epub.getMetadata();
    const spine = epub.getSpine();
    const toc = epub.getToc();
    const coverImage = await extractCoverImage(epub, file);

    const chapters = await Promise.all(
      spine
        .filter((item) => item.linear !== "no")
        .map(async (item, index) => {
          const { html, css } = await epub.loadChapter(item.id);
          const resolvedCss = await resolveCss(css);
          return { id: item.id, order: index, html, css: resolvedCss };
        })
    );

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
