// Writes every icon and iOS startup image in public/ from src/brand, then checks them. Run it after changing
// the mark: `bun run icons`. Needs rsvg-convert and ImageMagick. Never edit the written files by hand.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	GROUND,
	INK,
	MARK,
	MASKABLE_BOX,
	markLines,
	markSvgLines,
} from "../src/brand/mark.ts";
import { IOS_SCREENS, startupImage } from "../src/brand/startup.ts";

const PUBLIC = join(import.meta.dir, "..", "public");
const ICONS = join(PUBLIC, "icons");

// How wide the 64-box is drawn on the 1024 canvas. Android crops the maskable icon to its middle two thirds;
// iOS and desktops show the whole tile, so the mark can sit larger there.
const ANY_BOX = 720;

function tile(box: number, rx = 0): string {
	const o = (1024 - box) / 2;
	const s = box / 64;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="${rx}" fill="${GROUND}"/><g transform="translate(${o} ${o}) scale(${s})" color="${INK}">${markSvgLines()}</g></svg>`;
}

// The favicon is drawn for 16 px: the 64-box fills the tile at a quarter scale, so the rows land on 3, 6, 9
// and 12 with 2 px lines and 1 px gaps. The ends keep the true taper, 12 / 9 / 6 / 3.
function favicon(): string {
	const s = 16 / 64;
	const bars = markLines()
		.map(
			(l) =>
				`<rect x="${l.x1 * s}" y="${l.y * s - 1}" width="${(l.x2 - l.x1) * s}" height="2" rx="1"/>`,
		)
		.join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3.2" fill="${GROUND}"/><g fill="${INK}">${bars}</g></svg>`;
}

// Android draws a notification's small icon from its shape alone, so the badge is the mark in white on nothing.
function badge(): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g transform="translate(6.4 6.4) scale(0.8)" color="#fff">${markSvgLines()}</g></svg>`;
}

function png(svg: string, file: string, size: number): string {
	const out = join(PUBLIC, file);
	execFileSync("rsvg-convert", ["-w", `${size}`, "-h", `${size}`, "-o", out], {
		input: svg,
	});
	return out;
}

function fail(msg: string): never {
	console.error(`icons: ${msg}`);
	process.exit(1);
}

rmSync(ICONS, { recursive: true, force: true });
mkdirSync(ICONS, { recursive: true });

const maskable = tile(MASKABLE_BOX);
const any = tile(ANY_BOX, 230);
const apple = tile(ANY_BOX);
const fav = favicon();

const written: [string, number][] = [
	[png(maskable, "icons/maskable-192x192.png", 192), 192],
	[png(maskable, "icons/maskable-512x512.png", 512), 512],
	[png(any, "icons/pwa-192x192.png", 192), 192],
	[png(any, "icons/pwa-512x512.png", 512), 512],
	[png(apple, "icons/apple-touch-icon-180x180.png", 180), 180],
	[png(badge(), "icons/badge-96x96.png", 96), 96],
];

writeFileSync(join(PUBLIC, "favicon.svg"), `${fav}\n`);
const favPngs = [16, 32, 48].map((s) => png(fav, `icons/favicon-${s}.png`, s));
execFileSync("magick", [...favPngs, join(PUBLIC, "favicon.ico")]);
for (const f of favPngs) rmSync(f);

for (const screen of IOS_SCREENS) {
	const [w, h, r] = screen;
	execFileSync("magick", [
		"-size",
		`${w * r}x${h * r}`,
		`xc:${GROUND}`,
		"-define",
		"png:exclude-chunks=date,time",
		`PNG8:${join(PUBLIC, startupImage(screen))}`,
	]);
}

// Checks: every size as named, the ICO's three sizes, and the mark inside Android's maskable safe zone (a
// circle of 40% of the icon). The farthest point is the top line's end cap.
const identify = (f: string) =>
	execFileSync("magick", ["identify", "-format", "%wx%h ", f])
		.toString()
		.trim();
for (const [f, s] of written)
	if (identify(f) !== `${s}x${s}`) fail(`${f} is ${identify(f)}`);
const ico = identify(join(PUBLIC, "favicon.ico"));
if (ico !== "16x16 32x32 48x48") fail(`favicon.ico holds ${ico}`);

const top = markLines()[0];
const reach =
	(Math.hypot(top.x1 - MARK.cx, top.y - 32) + MARK.stroke / 2) *
	(MASKABLE_BOX / 64);
const safe = reach / 1024;
if (safe > 0.4)
	fail(
		`the mark reaches ${(safe * 100).toFixed(1)}% of the icon; the limit is 40%`,
	);

console.log(
	`${written.length + 1} icons, favicon.svg and ${IOS_SCREENS.length} startup images in public/`,
);
console.log(
	`maskable safe zone: the mark reaches ${(safe * 100).toFixed(1)}% of the icon from its centre (limit 40%)`,
);
