import sourceSerif from "../assets/fonts/source-serif-4-latin.woff2";
import { GROUND, MARK, markLines } from "../brand/mark";

// The image a shared passage travels with (design/share-card.html, option B1): the book's cover sharp and
// darkened as a frame, and inset from it a frosted pane of the same cover holding the passage in white, with
// the cover, its title and its author at the foot. Drawn here on the phone, at a size chats show sharp.
const W = 1080;
const H = 1350;
const INSET = 36;
const RADIUS = 40;
const PANE = { x: INSET, y: INSET, w: W - 2 * INSET, h: H - 2 * INSET };
// The pane's contents, inside its padding.
const BOX = {
	left: INSET + 76,
	right: W - INSET - 76,
	top: INSET + 86,
	bottom: H - INSET - 76,
};
const MARK_PX = 37;
const COVER_W = 150;
const COVER_H = 225;
const FOOT_GAP = 64;
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SERIF_FAMILY = "Source Serif 4";
const SERIF = `"${SERIF_FAMILY}"`;

let fontLoaded: Promise<void> | undefined;
const loadFont = () => {
	fontLoaded ??= new FontFace(SERIF_FAMILY, `url(${sourceSerif})`, {
		weight: "200 900",
	})
		.load()
		.then((face) => {
			document.fonts.add(face);
		})
		.catch(() => {});
	return fontLoaded;
};

const loadImage = (url: string) =>
	new Promise<HTMLImageElement | undefined>((resolve) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => resolve(undefined);
		image.src = url;
	});

// A short line is set large, a long one smaller, and either shrinks further until it fits.
const startSize = (chars: number) =>
	Math.round(
		(chars < 70 ? 88 : chars < 140 ? 70 : chars < 220 ? 58 : 50) * 0.9,
	);
const MIN_SIZE = 30;

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
	const lines: string[] = [];
	let line = "";
	for (const word of text.split(/\s+/)) {
		const next = line ? `${line} ${word}` : word;
		if (line && ctx.measureText(next).width > width) {
			lines.push(line);
			line = word;
		} else line = next;
	}
	if (line) lines.push(line);
	return lines;
}

// Fits lines into a height, ending the last that fits with an ellipsis if some were left out.
function clip(
	ctx: CanvasRenderingContext2D,
	lines: string[],
	room: number,
	width: number,
) {
	if (lines.length <= room) return lines;
	const kept = lines.slice(0, Math.max(1, room));
	let last = kept[kept.length - 1];
	while (last && ctx.measureText(`${last}…`).width > width)
		last = last.slice(0, last.lastIndexOf(" "));
	kept[kept.length - 1] = `${last.replace(/[\s,;:.]+$/, "")}…`;
	return kept;
}

function cover(
	ctx: CanvasRenderingContext2D,
	image: HTMLImageElement,
	x: number,
	y: number,
	w: number,
	h: number,
) {
	const scale = Math.max(w / image.width, h / image.height);
	const sw = w / scale;
	const sh = h / scale;
	ctx.drawImage(
		image,
		(image.width - sw) / 2,
		(image.height - sh) / 2,
		sw,
		sh,
		x,
		y,
		w,
		h,
	);
}

function averageOf(image: HTMLImageElement) {
	const tiny = document.createElement("canvas");
	tiny.width = tiny.height = 1;
	const t = tiny.getContext("2d");
	if (!t) return GROUND;
	t.drawImage(image, 0, 0, 1, 1);
	const [r, g, b] = t.getImageData(0, 0, 1, 1).data;
	return `rgb(${r * 0.6}, ${g * 0.6}, ${b * 0.6})`;
}

const pane = (ctx: CanvasRenderingContext2D) => {
	ctx.beginPath();
	ctx.roundRect(PANE.x, PANE.y, PANE.w, PANE.h, RADIUS);
};

// The frame and the frosted pane. The frost is the cover drawn again under the pane, blurred where canvases
// can blur (older Safari can't, and gets the cover's average colour instead).
function ground(ctx: CanvasRenderingContext2D, image?: HTMLImageElement) {
	if (image) cover(ctx, image, 0, 0, W, H);
	else {
		const fill = ctx.createLinearGradient(0, 0, W, H);
		fill.addColorStop(0, "#1d3a30");
		fill.addColorStop(1, GROUND);
		ctx.fillStyle = fill;
		ctx.fillRect(0, 0, W, H);
	}
	ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
	ctx.fillRect(0, 0, W, H);

	ctx.save();
	ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
	ctx.shadowBlur = 80;
	ctx.shadowOffsetY = 30;
	pane(ctx);
	ctx.fillStyle = "#000";
	ctx.fill();
	ctx.restore();

	ctx.save();
	pane(ctx);
	ctx.clip();
	if (!image) {
		ctx.fillStyle = "#16241f";
		ctx.fillRect(0, 0, W, H);
		ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
		ctx.fillRect(0, 0, W, H);
	} else if (typeof (ctx as { filter?: unknown }).filter === "string") {
		ctx.filter = "blur(38px) saturate(1.4) brightness(0.62)";
		cover(ctx, image, -60, -60, W + 120, H + 120);
		ctx.filter = "none";
	} else {
		ctx.fillStyle = averageOf(image);
		ctx.fillRect(0, 0, W, H);
	}
	ctx.restore();

	ctx.save();
	pane(ctx);
	ctx.lineWidth = 1.5;
	ctx.strokeStyle = "rgba(255, 255, 255, 0.24)";
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(PANE.x + RADIUS, PANE.y + 1.5);
	ctx.lineTo(PANE.x + PANE.w - RADIUS, PANE.y + 1.5);
	ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
	ctx.stroke();
	ctx.restore();
}

function mark(ctx: CanvasRenderingContext2D) {
	const scale = MARK_PX / 64;
	ctx.save();
	ctx.globalAlpha = 0.9;
	ctx.strokeStyle = ctx.fillStyle = "#fff";
	ctx.lineWidth = MARK.stroke * scale * 1.5;
	ctx.lineCap = "round";
	for (const l of markLines()) {
		ctx.beginPath();
		ctx.moveTo(BOX.left + l.x1 * scale, BOX.top + l.y * scale);
		ctx.lineTo(BOX.left + l.x2 * scale, BOX.top + l.y * scale);
		ctx.stroke();
	}
	// Centred on the lines, which run from 16 to 52 of the mark's 64.
	ctx.font = `800 33px ${SANS}`;
	ctx.textBaseline = "middle";
	ctx.fillText("anquar", BOX.left + MARK_PX + 15, BOX.top + 34 * scale);
	ctx.restore();
}

// Returns the top of the foot, which the passage sits above.
function foot(
	ctx: CanvasRenderingContext2D,
	title: string,
	author: string,
	image?: HTMLImageElement,
) {
	const top = BOX.bottom - COVER_H;
	let x = BOX.left;
	if (image) {
		ctx.save();
		ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
		ctx.shadowBlur = 40;
		ctx.shadowOffsetY = 18;
		ctx.beginPath();
		ctx.roundRect(x, top, COVER_W, COVER_H, 12);
		ctx.fillStyle = "#000";
		ctx.fill();
		ctx.restore();
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(x, top, COVER_W, COVER_H, 12);
		ctx.clip();
		cover(ctx, image, x, top, COVER_W, COVER_H);
		ctx.restore();
		x += COVER_W + 30;
	}
	const width = BOX.right - x;
	ctx.fillStyle = "#fff";
	ctx.textBaseline = "alphabetic";
	ctx.font = `700 38px ${SANS}`;
	const titleLines = clip(ctx, wrap(ctx, title, width), 2, width);
	ctx.font = `500 32px ${SANS}`;
	const [authorLine] = clip(ctx, wrap(ctx, author, width), 1, width);
	// Beside the cover the title and author are centred on it; with no cover they sit on the foot's line.
	const block = titleLines.length * 44 + (authorLine ? 46 : 0);
	const blockTop = image ? top + (COVER_H - block) / 2 : BOX.bottom - block;
	let y = blockTop + 36;
	ctx.font = `700 38px ${SANS}`;
	for (const line of titleLines) {
		ctx.fillText(line, x, y);
		y += 44;
	}
	if (authorLine) {
		ctx.globalAlpha = 0.75;
		ctx.font = `500 32px ${SANS}`;
		ctx.fillText(authorLine, x, y + 4);
		ctx.globalAlpha = 1;
	}
	return image ? top : blockTop;
}

function passage(ctx: CanvasRenderingContext2D, text: string, bottom: number) {
	const width = BOX.right - BOX.left;
	const top = BOX.top + MARK_PX + 60;
	const quoted = `“${text}”`;
	let size = startSize(text.length);
	let lines: string[];
	for (;;) {
		ctx.font = `400 ${size}px ${SERIF}, Georgia, serif`;
		lines = wrap(ctx, quoted, width);
		if (lines.length * size * 1.36 <= bottom - top || size <= MIN_SIZE) break;
		size -= 4;
	}
	const lead = size * 1.36;
	lines = clip(ctx, lines, Math.floor((bottom - top) / lead), width);
	ctx.save();
	ctx.fillStyle = "#fff";
	ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
	ctx.shadowBlur = 24;
	ctx.shadowOffsetY = 2;
	ctx.textBaseline = "alphabetic";
	let y = bottom - lines.length * lead + size;
	for (const line of lines) {
		ctx.fillText(line, BOX.left, y);
		y += lead;
	}
	ctx.restore();
}

export async function shareCard(book: {
	author: string;
	coverUrl?: string;
	text: string;
	title: string;
}): Promise<Blob> {
	await loadFont();
	const image = book.coverUrl ? await loadImage(book.coverUrl) : undefined;
	const canvas = document.createElement("canvas");
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("No canvas");
	ground(ctx, image);
	mark(ctx);
	const footTop = foot(ctx, book.title, book.author, image);
	passage(ctx, book.text, footTop - FOOT_GAP);
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("No image"))),
			"image/jpeg",
			0.92,
		),
	);
}
