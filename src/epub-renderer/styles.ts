export interface HeadingStyle {
	fontFamily?: string;
	fontSize?: string;
	fontWeight?: string;
	lineHeight?: string;
	marginTop?: string;
	marginBottom?: string;
	textAlign?: string;
}

export interface TypographyConfig {
	fontFamily?: string;
	fontSize?: string;
	lineHeight?: string;
	textAlign?: "left" | "justify" | "start";
	hyphenate?: boolean;
	wordSpacing?: string;
	letterSpacing?: string;

	paragraph?: {
		marginBottom?: string;
		textIndent?: string;
	};

	heading?: Record<1 | 2 | 3 | 4 | 5 | 6, HeadingStyle>;

	list?: {
		paddingLeft?: string;
		marginBottom?: string;
		listStyleType?: string;
	};

	blockquote?: {
		fontFamily?: string;
		fontSize?: string;
		fontStyle?: string;
		marginLeft?: string;
		marginRight?: string;
		borderLeft?: string;
		color?: string;
	};

	code?: {
		fontFamily?: string;
		fontSize?: string;
		backgroundColor?: string;
		padding?: string;
		borderRadius?: string;
	};

	pre?: {
		fontFamily?: string;
		fontSize?: string;
		lineHeight?: string;
		backgroundColor?: string;
		padding?: string;
		borderRadius?: string;
		overflowX?: string;
	};

	image?: {
		maxWidth?: string;
		borderRadius?: string;
		marginTop?: string;
		marginBottom?: string;
	};

	horizontalRule?: {
		marginTop?: string;
		marginBottom?: string;
		borderStyle?: string;
		borderColor?: string;
	};

	table?: {
		fontSize?: string;
		borderCollapse?: string;
		cellPadding?: string;
		headerBg?: string;
		headerWeight?: string;
		alternateRows?: boolean;
	};

	link?: {
		color?: string;
		textDecoration?: string;
	};
}

export const TYPOGRAPHY_DEFAULTS: TypographyConfig = {
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
	fontSize: "1em",
	lineHeight: "1.7",
	textAlign: "left",
	hyphenate: false,
	wordSpacing: "normal",
	letterSpacing: "normal",

	paragraph: { marginBottom: "1em", textIndent: "0" },

	heading: {
		1: {
			fontSize: "1.8em",
			fontWeight: "bold",
			lineHeight: "1.3",
			marginTop: "1.5em",
			marginBottom: "0.5em",
		},
		2: {
			fontSize: "1.5em",
			fontWeight: "bold",
			lineHeight: "1.3",
			marginTop: "1.2em",
			marginBottom: "0.4em",
		},
		3: {
			fontSize: "1.3em",
			fontWeight: "bold",
			lineHeight: "1.3",
			marginTop: "1em",
			marginBottom: "0.3em",
		},
		4: {
			fontSize: "1.1em",
			fontWeight: "bold",
			lineHeight: "1.4",
			marginTop: "0.8em",
			marginBottom: "0.2em",
		},
		5: {
			fontSize: "1em",
			fontWeight: "bold",
			lineHeight: "1.4",
			marginTop: "0.5em",
			marginBottom: "0.1em",
		},
		6: {
			fontSize: "0.9em",
			fontWeight: "bold",
			lineHeight: "1.4",
			marginTop: "0.5em",
			marginBottom: "0.1em",
		},
	},

	list: { paddingLeft: "1.5em", marginBottom: "1em", listStyleType: "disc" },

	blockquote: {
		fontStyle: "italic",
		marginLeft: "1.5em",
		borderLeft: "2px solid",
	},

	code: { fontFamily: "monospace", fontSize: "0.9em" },

	pre: {
		fontFamily: "monospace",
		fontSize: "0.9em",
		lineHeight: "1.5",
		padding: "1em",
		borderRadius: "8px",
		overflowX: "auto",
	},

	image: {
		maxWidth: "100%",
		borderRadius: "8px",
		marginTop: "1em",
		marginBottom: "1em",
	},

	horizontalRule: { marginTop: "1.5em", marginBottom: "1.5em" },

	table: {
		fontSize: "0.95em",
		borderCollapse: "collapse",
		alternateRows: true,
	},

	link: { color: "inherit", textDecoration: "underline" },
};

export function mergeTypography(
	overrides?: Partial<TypographyConfig>,
): TypographyConfig {
	if (!overrides) return { ...TYPOGRAPHY_DEFAULTS };

	const merged = { ...TYPOGRAPHY_DEFAULTS } as Record<string, unknown>;

	for (const key of Object.keys(overrides) as (keyof TypographyConfig)[]) {
		const val = overrides[key];
		if (val === undefined) continue;

		if (typeof val === "object" && !Array.isArray(val)) {
			const existing = merged[key] as Record<string, unknown>;
			merged[key] = { ...existing, ...(val as Record<string, unknown>) };
		} else {
			merged[key] = val;
		}
	}

	return merged as TypographyConfig;
}
