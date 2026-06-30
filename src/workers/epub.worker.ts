import { initEpubFile } from "@lingo-reader/epub-parser";
import type { WorkerMessage, WorkerResponse } from "../lib/types.ts";

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
    const coverImage = epub.getCoverImage() ?? null;

    const chapters = await Promise.all(
      spine
        .filter((item) => item.linear !== "no")
        .map(async (item, index) => {
          const { html, css } = await epub.loadChapter(item.id);
          return { id: item.id, order: index, html, css };
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
  } catch (error) {
    const response: WorkerResponse = {
      type: "ERROR",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    self.postMessage(response);
  }
};
