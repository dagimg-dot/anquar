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
	| { type: "paragraph"; children: Inline[]; cssClass?: string }
	| {
			type: "heading";
			level: 1 | 2 | 3 | 4 | 5 | 6;
			children: Inline[];
			cssClass?: string;
	  }
	| { type: "image"; src: string; alt: string; cssClass?: string }
	| { type: "list"; ordered: boolean; items: ListItem[]; cssClass?: string }
	| { type: "blockquote"; children: Block[]; cssClass?: string }
	| { type: "code"; language?: string; content: string; cssClass?: string }
	| { type: "pre"; content: string; cssClass?: string }
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

export type ClassMap = Record<string, Record<string, string>>;

export interface EpubCssMeta {
	fonts: EpubFontFace[];
	classMap?: ClassMap;
	bodyFontFamily?: string;
	direction?: "ltr" | "rtl";
	writingMode?: string;
}
