import type { ManifestItem } from "@lingo-reader/epub-parser";
import type JSZip from "jszip";
import { IMG_SRC_REGEX, uint8ArrayToDataUrl } from "./utils.ts";

type EpubInstance = Awaited<
  ReturnType<typeof import("@lingo-reader/epub-parser").initEpubFile>
>;

async function extractFromManifestProperty(
  epub: EpubInstance,
  zip: JSZip,
  manifest: Record<string, ManifestItem>
): Promise<string | null> {
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

  return null;
}

async function extractFromMetaTag(
  epub: EpubInstance,
  zip: JSZip,
  manifest: Record<string, ManifestItem>
): Promise<string | null> {
  const metadata = epub.getMetadata();
  const coverMetaId = metadata.metas?.cover;

  if (!(coverMetaId && manifest[coverMetaId])) {
    return null;
  }

  const coverItem = manifest[coverMetaId];
  if (!coverItem.mediaType.startsWith("image/")) {
    return null;
  }

  const entry = zip.file(coverItem.href);
  if (!entry) {
    return null;
  }

  const bytes = await entry.async("uint8array");
  return uint8ArrayToDataUrl(bytes, coverItem.mediaType);
}

async function extractCoverFromGuide(
  epub: EpubInstance
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

export async function extractCoverImage(
  epub: EpubInstance,
  zip: JSZip
): Promise<string | null> {
  const manifest = epub.getManifest();
  return (
    (await extractFromManifestProperty(epub, zip, manifest)) ??
    (await extractFromMetaTag(epub, zip, manifest)) ??
    (await extractCoverFromGuide(epub))
  );
}
