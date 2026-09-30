import type { Block, Card, CardLayout } from "anquar-core";

export const LAYOUT_SAMPLE =
	"The rain had not stopped since morning, and by the time she reached the station the streets were running like shallow rivers. She stood under the awning for a while, watching the buses pull away one after another, each of them full of tired faces pressed against fogged windows. Somewhere behind her a door opened and closed, letting out a smell of coffee and warm bread that made her realize she had not eaten anything all day. It was strange, she thought, how quickly a plan could fall apart. A week ago everything had seemed so simple: finish the work, pack the car, drive north before the weather turned. Now the car was in a garage on the other side of town, the work was still unfinished, and the weather had turned anyway. She pulled her coat tighter and stepped back into the crowd, letting it carry her toward the platform. There would be another train, and another after that. There always was. What mattered was deciding where to go once she was on it, and that, for the first time in years, was a question she could answer however she liked.";

export function readLayout(
	page: HTMLElement,
	paragraph: HTMLElement,
	line: HTMLElement,
): CardLayout | null {
	const style = getComputedStyle(page);
	const height =
		page.clientHeight -
		Number.parseFloat(style.paddingTop) -
		Number.parseFloat(style.paddingBottom);
	const lineHeight = line.getBoundingClientRect().height;
	if (height <= 0 || lineHeight <= 0) return null;
	const lines = Math.round(
		paragraph.getBoundingClientRect().height / lineHeight,
	);
	if (lines <= 0) return null;

	return {
		charsPerLine: Math.floor(LAYOUT_SAMPLE.length / lines),
		linesPerCard: Math.floor(height / lineHeight),
	};
}

type Place = [chapter: number, position: number, offset: number];

function placeOf(block: Block): Place {
	const split = /[@#](\d+)$/.exec(block.id);
	return [block.chapterIndex, block.position, split ? Number(split[1]) : 0];
}

function before(a: Place, b: Place): boolean {
	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) return a[i] < b[i];
	}
	return false;
}

export function findCardHolding(
	cards: readonly Card[],
	cardId: string,
): number {
	const exact = cards.findIndex((c) => c.id === cardId);
	if (exact >= 0) return exact;

	const match = /^c(\d+)-(\d+)(?:[@#](\d+))?$/.exec(cardId);
	if (!match) return -1;
	const target: Place = [
		Number(match[1]),
		Number(match[2]),
		Number(match[3] ?? 0),
	];

	let found = -1;
	cards.forEach((card, i) => {
		if (!before(target, placeOf(card.blocks[0]))) found = i;
	});
	return found;
}

export function reuseCards(next: Card[], prev: readonly Card[]): Card[] {
	const byId = new Map(prev.map((card) => [card.id, card]));
	return next.map((card) => {
		const old = byId.get(card.id);
		const same =
			old !== undefined &&
			old.blocks.length === card.blocks.length &&
			old.blocks.every(
				(b, i) =>
					b.id === card.blocks[i].id &&
					b.charCount === card.blocks[i].charCount &&
					b.type === card.blocks[i].type,
			);
		return same ? old : card;
	});
}
