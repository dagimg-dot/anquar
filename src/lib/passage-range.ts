// Where a saved passage sits in a card. A selection's text has line breaks between paragraphs that the page's
// text doesn't, so the two are matched with all whitespace left out.
export function rangeOf(root: Node, passage: string): Range | undefined {
	const want = passage.replace(/\s+/g, "");
	if (!want) return;
	const chars: [Text, number][] = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node as Text;
		for (let i = 0; i < text.data.length; i++)
			if (!/\s/.test(text.data[i])) chars.push([text, i]);
	}
	const at = chars
		.map(([text, i]) => text.data[i])
		.join("")
		.indexOf(want);
	if (at < 0) return;
	const [startNode, start] = chars[at];
	const [endNode, end] = chars[at + want.length - 1];
	const range = document.createRange();
	range.setStart(startNode, start);
	range.setEnd(endNode, end + 1);
	return range;
}
