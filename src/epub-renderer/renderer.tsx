import { For, onMount } from "solid-js";
import { mergeTypography, type TypographyConfig } from "./styles";
import type {
	Block,
	EpubCssMeta,
	Inline,
	ListItem,
	TableCell,
	TableRow,
} from "./types";

export type { TypographyConfig } from "./styles";
export { mergeTypography, TYPOGRAPHY_DEFAULTS } from "./styles";

export interface RendererProps {
	blocks: Block[];
	typography?: Partial<TypographyConfig>;
	theme: { textColor: string; bgColor: string };
	settings: { fontSize: number; lineHeight: number; hPadding: number };
	epubMeta?: EpubCssMeta;
	epubFontsEnabled?: boolean;
}

// Track injected @font-face to avoid duplicates
const injectedFonts = new Set<string>();

export function BlockRenderer(props: RendererProps) {
	const styles = () => mergeTypography(props.typography);
	const ctx = () => ({
		styles: styles(),
		theme: props.theme,
		settings: props.settings,
	});

	const useEpubDir = props.epubMeta?.direction && !styles().textAlign;
	const useEpubWm = props.epubMeta?.writingMode;
	const epubFonts = props.epubFontsEnabled ? props.epubMeta?.fonts : undefined;
	const epubDir = useEpubDir ? props.epubMeta?.direction : undefined;
	const epubWm = useEpubWm ? props.epubMeta?.writingMode : undefined;

	onMount(() => {
		if (!epubFonts || epubFonts.length === 0) return;
		const key = epubFonts.map((f) => `${f.family}|${f.src}`).join("::");
		if (injectedFonts.has(key)) return;
		injectedFonts.add(key);

		let cssText = "";
		for (const font of epubFonts) {
			cssText += `@font-face{font-family:"${font.family}";src:url("${font.src}");`;
			if (font.style) cssText += `font-style:${font.style};`;
			if (font.weight) cssText += `font-weight:${font.weight};`;
			cssText += "}";
		}
		const style = document.createElement("style");
		style.textContent = cssText;
		style.setAttribute("data-epub-fonts", "");
		document.head.appendChild(style);
	});

	return (
		<div
			style={
				{
					"font-family": epubFonts
						? `${props.epubMeta?.bodyFontFamily ?? "inherit"}, ${styles().fontFamily}`
						: styles().fontFamily,
					"font-size": styles().fontSize,
					"line-height": styles().lineHeight,
					"text-align": styles().textAlign,
					direction: epubDir,
					"writing-mode": epubWm,
					...((styles().hyphenate
						? { hyphens: "auto" as const }
						: {}) as Record<string, string>),
					"word-spacing": styles().wordSpacing,
					"letter-spacing": styles().letterSpacing,
					color: props.theme.textColor,
					background: props.theme.bgColor,
					"--reader-h-padding": `${props.settings.hPadding}rem`,
				} as Record<string, string>
			}
		>
			<For each={props.blocks}>
				{(block) => <BlockComponent block={block} ctx={ctx()} />}
			</For>
		</div>
	);
}

// --- Block components ---

function BlockComponent(props: { block: Block; ctx: RenderCtx }) {
	const s = () => props.ctx.styles;

	switch (props.block.type) {
		case "paragraph":
			return (
				<p
					style={{
						"margin-bottom": s().paragraph?.marginBottom,
						"text-indent": s().paragraph?.textIndent,
						"font-size": `${props.ctx.settings.fontSize}%`,
						"line-height": props.ctx.settings.lineHeight,
					}}
				>
					<InlineRenderer inlines={props.block.children} ctx={props.ctx} />
				</p>
			);

		case "heading": {
			const h = s().heading?.[props.block.level];
			const Tag = `h${props.block.level}` as const;
			return (
				<Tag
					style={
						{
							"font-family": h?.fontFamily,
							"font-size": h?.fontSize,
							"font-weight": h?.fontWeight,
							"line-height": h?.lineHeight,
							"margin-top": h?.marginTop,
							"margin-bottom": h?.marginBottom,
							"text-align": h?.textAlign,
						} as Record<string, string>
					}
				>
					<InlineRenderer inlines={props.block.children} ctx={props.ctx} />
				</Tag>
			);
		}

		case "image":
			return (
				<img
					alt={props.block.alt}
					src={props.block.src}
					style={{
						"max-width": s().image?.maxWidth,
						"border-radius": s().image?.borderRadius,
						"margin-top": s().image?.marginTop,
						"margin-bottom": s().image?.marginBottom,
						display: "block",
					}}
				/>
			);

		case "list":
			return props.block.ordered ? (
				<ol
					style={{
						"padding-left": s().list?.paddingLeft,
						"margin-bottom": s().list?.marginBottom,
					}}
				>
					<For each={props.block.items}>
						{(item) => <ListItemComponent item={item} ctx={props.ctx} />}
					</For>
				</ol>
			) : (
				<ul
					style={{
						"padding-left": s().list?.paddingLeft,
						"margin-bottom": s().list?.marginBottom,
					}}
				>
					<For each={props.block.items}>
						{(item) => <ListItemComponent item={item} ctx={props.ctx} />}
					</For>
				</ul>
			);

		case "blockquote":
			return (
				<blockquote
					style={{
						"font-family": s().blockquote?.fontFamily,
						"font-size": s().blockquote?.fontSize,
						"font-style": s().blockquote?.fontStyle,
						"margin-left": s().blockquote?.marginLeft,
						"margin-right": s().blockquote?.marginRight,
						"border-left": s().blockquote?.borderLeft,
						color: s().blockquote?.color,
						"padding-left": "0.8em",
						"margin-top": "1em",
						"margin-bottom": "1em",
					}}
				>
					<For each={props.block.children}>
						{(child) => <BlockComponent block={child} ctx={props.ctx} />}
					</For>
				</blockquote>
			);

		case "code":
			return (
				<pre
					style={
						{
							"font-family": s().pre?.fontFamily,
							"font-size": s().pre?.fontSize,
							"line-height": s().pre?.lineHeight,
							"background-color": s().pre?.backgroundColor,
							padding: s().pre?.padding,
							"border-radius": s().pre?.borderRadius,
							"overflow-x": s().pre?.overflowX,
							"white-space": "pre-wrap",
						} as Record<string, string>
					}
				>
					{props.block.content}
				</pre>
			);

		case "pre":
			return (
				<pre
					style={
						{
							"font-family": s().pre?.fontFamily,
							"font-size": s().pre?.fontSize,
							"line-height": s().pre?.lineHeight,
							"background-color": s().pre?.backgroundColor,
							padding: s().pre?.padding,
							"border-radius": s().pre?.borderRadius,
							"overflow-x": s().pre?.overflowX,
							"white-space": "pre-wrap",
						} as Record<string, string>
					}
				>
					{props.block.content}
				</pre>
			);

		case "horizontalRule":
			return (
				<hr
					style={{
						"margin-top": s().horizontalRule?.marginTop,
						"margin-bottom": s().horizontalRule?.marginBottom,
						border: "none",
						"border-top": `1px solid ${props.ctx.theme.textColor}33`,
					}}
				/>
			);

		case "table":
			return (
				<div style={{ "overflow-x": "auto" } as Record<string, string>}>
					<table
						style={
							{
								"font-size": s().table?.fontSize,
								"border-collapse": s().table?.borderCollapse,
								width: "100%",
							} as Record<string, string>
						}
					>
						<tbody>
							<For each={props.block.rows}>
								{(row, rowIdx) => (
									<TableRowComponent
										row={row}
										rowIdx={rowIdx()}
										ctx={props.ctx}
									/>
								)}
							</For>
						</tbody>
					</table>
				</div>
			);
	}
}

// --- Sub-components ---

interface RenderCtx {
	styles: TypographyConfig;
	theme: { textColor: string; bgColor: string };
	settings: { fontSize: number; lineHeight: number; hPadding: number };
}

function ListItemComponent(props: { item: ListItem; ctx: RenderCtx }) {
	return (
		<li>
			<For each={props.item.children}>
				{(child) => <BlockComponent block={child} ctx={props.ctx} />}
			</For>
		</li>
	);
}

function TableRowComponent(props: {
	row: TableRow;
	rowIdx: number;
	ctx: RenderCtx;
}) {
	const bg = () => {
		if (!props.ctx.styles.table?.alternateRows) return undefined;
		return props.rowIdx % 2 === 1
			? `${props.ctx.theme.textColor}08`
			: undefined;
	};

	return (
		<tr style={{ background: bg() }}>
			<For each={props.row.cells}>
				{(cell) => <TableCellComponent cell={cell} ctx={props.ctx} />}
			</For>
		</tr>
	);
}

function TableCellComponent(props: { cell: TableCell; ctx: RenderCtx }) {
	const Tag = props.cell.header ? "th" : "td";
	const padding = props.ctx.styles.table?.cellPadding ?? "0.5em";

	return (
		<Tag
			style={
				{
					padding,
					"font-weight": props.cell.header
						? (props.ctx.styles.table?.headerWeight ?? "bold")
						: "normal",
					"text-align": (props.cell.header ? "left" : undefined) as
						| string
						| undefined,
					"border-bottom": `1px solid ${props.ctx.theme.textColor}22`,
				} as Record<string, string>
			}
		>
			<For each={props.cell.children}>
				{(child) => <BlockComponent block={child} ctx={props.ctx} />}
			</For>
		</Tag>
	);
}

// --- Inline renderer ---

function InlineRenderer(props: { inlines: Inline[]; ctx: RenderCtx }) {
	const s = () => props.ctx.styles;

	return (
		<For each={props.inlines}>
			{(inline) => {
				switch (inline.type) {
					case "text":
						return inline.content;

					case "strong":
						return (
							<strong>
								<InlineRenderer inlines={inline.children} ctx={props.ctx} />
							</strong>
						);

					case "emphasis":
						return (
							<em>
								<InlineRenderer inlines={inline.children} ctx={props.ctx} />
							</em>
						);

					case "underline":
						return (
							<u>
								<InlineRenderer inlines={inline.children} ctx={props.ctx} />
							</u>
						);

					case "strikethrough":
						return (
							<s>
								<InlineRenderer inlines={inline.children} ctx={props.ctx} />
							</s>
						);

					case "superscript":
						return (
							<sup>
								<InlineRenderer inlines={inline.children} ctx={props.ctx} />
							</sup>
						);

					case "subscript":
						return (
							<sub>
								<InlineRenderer inlines={inline.children} ctx={props.ctx} />
							</sub>
						);

					case "code":
						return (
							<code
								style={{
									"font-family": s().code?.fontFamily,
									"font-size": s().code?.fontSize,
									"background-color": s().code?.backgroundColor,
									padding: s().code?.padding,
									"border-radius": s().code?.borderRadius,
								}}
							>
								{inline.content}
							</code>
						);

					case "link":
						return (
							<a
								href={inline.href}
								style={{
									color: s().link?.color,
									"text-decoration": s().link?.textDecoration,
								}}
							>
								<InlineRenderer inlines={inline.children} ctx={props.ctx} />
							</a>
						);

					case "image":
						return (
							<img
								alt={inline.alt}
								src={inline.src}
								style={{
									"max-width": "100%",
									"border-radius": s().image?.borderRadius,
									display: "inline-block",
									"vertical-align": "middle",
								}}
							/>
						);

					case "lineBreak":
						return <br />;

					case "bold":
						return (
							<b>
								<InlineRenderer inlines={inline.children} ctx={props.ctx} />
							</b>
						);

					case "italic":
						return (
							<i>
								<InlineRenderer inlines={inline.children} ctx={props.ctx} />
							</i>
						);
				}
			}}
		</For>
	);
}
