import { BOOKS, type BookId } from "./sample.ts";

export function coverHTML(id: BookId) {
	const book = BOOKS[id];
	return `<div class="cv cv-${book.style}" style="--cv-bg:${book.bg};--cv-ink:${book.ink}"><span class="cv-author">${book.author}</span><span class="cv-rule"></span><span class="cv-title">${book.title}</span></div>`;
}

// A cover the size of BookCover, with its shade and, when there is one, the place read as a bar.
export function bookCover(id: BookId, percent?: number) {
	const progress =
		percent === undefined
			? ""
			: `<span class="prog"><i style="width:${percent}%"></i></span>`;
	return `<div class="cover shade">${coverHTML(id)}${progress}</div>`;
}
