import toast from "solid-toast";
import { shareCard } from "./share-card.ts";

export interface PassageShare {
	image: Blob;
	name: string;
	text: string;
}

/**
 * A passage leaves as an image of it (share-card.ts) with the passage as text, the book on the line below,
 * so a chat that shows only words still gets the whole quote; the Share sheet shows the image first. Without
 * an image the words go out on their own, through the phone's share sheet or the clipboard, and this gives
 * nothing back.
 */
export async function preparePassage(
	book: { author: string; coverUrl?: string; title: string },
	passage: string,
): Promise<PassageShare | undefined> {
	const text = `“${passage}”\n— ${book.title}, ${book.author}`;
	const name =
		book.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") ||
		"passage";
	// Drawing the image takes a moment on a phone; anything slower than a blink says so until it's done.
	let making: string | undefined;
	const slow = setTimeout(() => {
		making = toast.loading("Generating image…");
	}, 200);
	const image = await shareCard({
		author: book.author,
		coverUrl: book.coverUrl,
		text: passage,
		title: book.title,
	})
		.catch(() => undefined)
		.finally(() => {
			clearTimeout(slow);
			if (making) toast.dismiss(making);
		});
	if (image) return { image, name, text };
	if (navigator.share) {
		await navigator.share({ text }).catch(() => {});
		return;
	}
	try {
		await navigator.clipboard.writeText(text);
		toast.success("Passage copied");
	} catch {
		toast.error("Could not share this passage");
	}
}
