// The reader's own selection: the words of one card, picked a whole word at a time. The page itself is never
// selectable, so Chrome's handles and menu never appear; this finds the word under a finger and draws the pick
// with the Custom Highlight API, leaving the card's text nodes as they are.

export interface Word {
	end: number;
	/** With the quotes and punctuation around it, for a pick of more than one word. */
	outerEnd: number;
	outerStart: number;
	start: number;
}

const BLOCKS = "p,h1,h2,h3,h4,h5,h6,li,figcaption,blockquote";
const SKIP = "[aria-hidden='true'],[data-pick-skip]";
const CLOSERS = /[.,;:!?)\]”’"'…]/;
const OPENERS = /[([“‘"']/;
const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

/**
 * A card's text as one string, with a line break between blocks that the page doesn't have, so a word never
 * runs from one paragraph into the next and a pick across them reads as separate paragraphs.
 */
export class PageText {
	readonly root: HTMLElement;
	readonly text: string;
	readonly words: Word[] = [];
	private readonly nodes: { node: Text; start: number }[] = [];

	constructor(root: HTMLElement) {
		this.root = root;
		let text = "";
		let block: Element | null = null;
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const parent = node.parentElement;
			if (!parent || parent.closest(SKIP)) continue;
			const own = parent.closest(BLOCKS);
			if (text && own !== block) text += "\n";
			block = own;
			this.nodes.push({ node: node as Text, start: text.length });
			text += (node as Text).data;
		}
		this.text = text;

		for (const s of segmenter.segment(text)) {
			if (!s.isWordLike) continue;
			const start = s.index;
			const end = start + s.segment.length;
			let outerStart = start;
			let outerEnd = end;
			while (outerEnd < text.length && CLOSERS.test(text[outerEnd])) outerEnd++;
			while (outerStart > 0 && OPENERS.test(text[outerStart - 1])) outerStart--;
			this.words.push({ end, outerEnd, outerStart, start });
		}
	}

	/** The offset under a point, held inside the card so a finger in the margin still counts. */
	offsetAt(x: number, y: number): number | undefined {
		const box = this.root.getBoundingClientRect();
		const cx = Math.min(Math.max(x, box.left + 1), box.right - 1);
		const cy = Math.min(Math.max(y, box.top + 1), box.bottom - 1);
		let node: Node | undefined;
		let offset = 0;
		if (document.caretPositionFromPoint) {
			const at = document.caretPositionFromPoint(cx, cy);
			if (at) [node, offset] = [at.offsetNode, at.offset];
		} else {
			const at = document.caretRangeFromPoint?.(cx, cy);
			if (at) [node, offset] = [at.startContainer, at.startOffset];
		}
		if (!node || !this.root.contains(node)) return;
		if (node.nodeType !== Node.TEXT_NODE) {
			const after = node.childNodes[offset];
			const inside = this.nodes.filter((n) => (after ?? node).contains(n.node));
			const hit = after ? inside[0] : inside.at(-1);
			if (!hit) return;
			return after ? hit.start : hit.start + hit.node.data.length;
		}
		const hit = this.nodes.find((n) => n.node === node);
		return hit && hit.start + offset;
	}

	wordNear(offset: number): Word | undefined {
		let best: Word | undefined;
		let bestDistance = Number.POSITIVE_INFINITY;
		for (const w of this.words) {
			const distance =
				offset < w.start
					? w.start - offset
					: offset >= w.end
						? offset - w.end + 1
						: 0;
			if (distance < bestDistance) [best, bestDistance] = [w, distance];
			if (w.start > offset) break;
		}
		return best;
	}

	range(start: number, end: number): Range {
		const at = (offset: number, isEnd: boolean): [Text, number] => {
			for (const { node, start: from } of this.nodes) {
				const to = from + node.data.length;
				if (offset < to || (isEnd && offset === to))
					return [node, Math.max(0, offset - from)];
			}
			const last = this.nodes[this.nodes.length - 1];
			return [last.node, last.node.data.length];
		};
		const range = document.createRange();
		range.setStart(...at(start, false));
		range.setEnd(...at(end, true));
		return range;
	}
}

/** From one word to another in either order: one word is just the word, a passage takes its punctuation. */
export function span(a: Word, b: Word): { end: number; start: number } {
	const [first, last] = a.start <= b.start ? [a, b] : [b, a];
	return first === last
		? { end: first.end, start: first.start }
		: { end: last.outerEnd, start: first.outerStart };
}
