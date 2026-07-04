export type Inline =
	| { type: "text"; content: string }
	| { type: "bold"; children: Inline[] }
	| { type: "italic"; children: Inline[] }
	| { type: "emphasis"; children: Inline[] }
	| { type: "strong"; children: Inline[] }
	| { type: "code"; content: string }
	| { type: "link"; href: string; children: Inline[] }
	| { type: "image"; src: string; alt: string }
	| { type: "lineBreak" }
	| { type: "superscript"; children: Inline[] }
	| { type: "subscript"; children: Inline[] }
	| { type: "underline"; children: Inline[] }
	| { type: "strikethrough"; children: Inline[] };

export interface TableCell {
	children: Block[];
	header: boolean;
}

export interface TableRow {
	cells: TableCell[];
}

export interface ListItem {
	children: Block[];
}

export type Block =
	| { type: "paragraph"; children: Inline[] }
	| { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: Inline[] }
	| { type: "image"; src: string; alt: string }
	| { type: "list"; ordered: boolean; items: ListItem[] }
	| { type: "blockquote"; children: Block[] }
	| { type: "code"; language?: string; content: string }
	| { type: "pre"; content: string }
	| { type: "horizontalRule" }
	| { type: "table"; rows: TableRow[] };

export type Chapter = Block[];

export interface ParsedChapter {
	blocks: Chapter;
	id: string;
	order: number;
}

export interface EpubFontFace {
	family: string;
	src: string;
	style?: string;
	weight?: string;
}

export interface EpubCssMeta {
	fonts: EpubFontFace[];
	bodyFontFamily?: string;
	direction?: "ltr" | "rtl";
	writingMode?: string;
}
