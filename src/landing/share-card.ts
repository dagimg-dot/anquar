import { coverHTML } from "./covers.ts";
import { BOOKS, type BookId } from "./sample.ts";

// The image Share sends (src/lib/share-card.ts): the cover as a darkened frame, and inset from it a frosted
// pane of the same cover holding the passage, with the cover, title and author at the foot.
export function renderShare(slot: Element, book: BookId, passage: string) {
	const { title, author } = BOOKS[book];
	slot.innerHTML = `<figure class="share-card" aria-label="A passage from ${title}, shared as an image">
		<div class="frame">${coverHTML(book)}</div>
		<div class="share-pane"><div class="frame">${coverHTML(book)}</div>
			<div class="text"><blockquote>${passage}</blockquote>
				<div class="share-foot"><div class="cover">${coverHTML(book)}</div><div><b>${title}</b><span>${author}</span></div></div>
			</div>
		</div>
	</figure>`;
}
