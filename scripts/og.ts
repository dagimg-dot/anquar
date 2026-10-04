// Writes the link-preview images into public/og/: the picture a chat, a timeline or a feed shows when
// anquar's address is pasted. Run it after changing the headline, the mark or the tokens: `bun run og`.
// Needs chromium and ffmpeg. Never edit the written files by hand. The design is option A of design/og.html.
import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { markSvgLines } from "../src/brand/mark.ts";
import { MOBY_DICK } from "../src/landing/sample.ts";

const ROOT = join(import.meta.dir, "..");
const OUT = join(ROOT, "public", "og");
const FONTS = join(ROOT, "src", "assets", "fonts");

// Facebook, LinkedIn, Slack, Discord, iMessage, WhatsApp and Telegram take the 1.91:1 card; X crops to 2:1.
// The rest are for posting by hand. WhatsApp drops a preview image over about 300 KB for a small thumbnail.
const SIZES = {
	og: { w: 1200, h: 630 },
	x: { w: 1200, h: 600 },
	square: { w: 1200, h: 1200 },
	pin: { w: 1000, h: 1500 },
	story: { w: 1080, h: 1920 },
} as const;
type Size = keyof typeof SIZES;
const MAX_BYTES = 300_000;

const HEADLINE = "Guilt-free <em>bookscrolling.</em>";
const LEDE = "Your EPUBs as a vertical feed, one screen of a book per swipe.";

const face = (family: string, file: string, style: string) =>
	`@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${readFileSync(join(FONTS, file)).toString("base64")}) format("woff2");font-weight:100 900;font-style:${style};font-display:block}`;

const manuscript = [
	...MOBY_DICK.paragraphs.slice(0, 5),
	...MOBY_DICK.paragraphs.slice(0, 5),
]
	.map((p) => `<p>${p}</p>`)
	.join("");

const page = (size: Size) => {
	const { w, h } = SIZES[size];
	return `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><style>
${face("Hanken Grotesk", "hanken-grotesk-latin.woff2", "normal")}
${face("Source Serif 4", "source-serif-4-latin.woff2", "normal")}
${face("Source Serif 4", "source-serif-4-italic-latin.woff2", "italic")}
${readFileSync(join(ROOT, "src", "theme", "tokens.css"), "utf8")}
*{box-sizing:border-box}
body{margin:0;background:var(--canvas)}
.og{--pad:76px;--safe-t:0px;--safe-b:0px;--fs:142px;--ls:32px;--ms:19px;--ms-cols:360px;
	position:relative;width:${w}px;height:${h}px;overflow:hidden;background:var(--canvas);color:var(--ink);font-family:var(--serif)}
.og[data-size=x]{--fs:138px}
.og[data-size=square]{--pad:92px;--fs:152px;--ls:36px;--ms:22px;--ms-cols:300px}
.og[data-size=pin]{--pad:88px;--fs:128px;--ls:34px;--ms:22px;--ms-cols:300px}
.og[data-size=story]{--pad:92px;--safe-t:170px;--safe-b:250px;--fs:134px;--ls:36px;--ms:22px;--ms-cols:300px}
.ms{position:absolute;inset:-30px}
.ms-cols{columns:3 var(--ms-cols);column-gap:64px;font:400 var(--ms)/1.85 var(--serif);text-align:justify;hyphens:auto;color:color-mix(in oklab,var(--ink) 7.5%,transparent)}
.ms-cols p{margin:0 0 .9em;text-indent:1.4em}
.vig{position:absolute;inset:0;background:
	radial-gradient(ellipse 70% 65% at 36% 52%,color-mix(in oklab,var(--canvas) 78%,transparent),transparent 72%),
	radial-gradient(ellipse 60% 70% at 100% 100%,color-mix(in oklab,var(--brand-950) 55%,transparent),transparent 70%),
	linear-gradient(to bottom,color-mix(in oklab,var(--canvas) 90%,transparent),transparent 22%,transparent 70%,color-mix(in oklab,var(--canvas) 95%,transparent))}
.in{position:absolute;inset:0;padding:calc(var(--pad) + var(--safe-t)) var(--pad) calc(var(--pad) + var(--safe-b));display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:16px;font:700 38px/1 var(--sans);letter-spacing:-.02em}
.brand svg{width:46px;height:46px;color:var(--brand-500)}
.mid{margin:auto 0}
h1{margin:0;font-weight:500;letter-spacing:-.03em;line-height:1.02;font-size:var(--fs)}
h1 em{display:block;font-style:italic;font-weight:400;color:var(--brand-500);line-height:1.1;padding-bottom:.06em}
.lede{margin:34px 0 0;font:400 var(--ls)/1.4 var(--sans);color:var(--ink-soft);text-wrap:balance}
.og[data-size=og] .lede,.og[data-size=x] .lede{display:none}
.bot{display:flex;justify-content:space-between;align-items:center;gap:30px}
.url{font:600 26px/1 var(--sans);letter-spacing:.01em;color:var(--ink-soft)}
.tags{font:400 31px/1 var(--serif);letter-spacing:-.005em;color:color-mix(in oklab,var(--ink) 62%,var(--ink-soft))}
.tags b{color:var(--brand-500);font-weight:700;font-size:1.25em;margin:0 .4em;position:relative;top:-.02em}
</style></head><body>
<div class="og" data-size="${size}">
<div class="ms"><div class="ms-cols">${manuscript}</div></div><div class="vig"></div>
<div class="in">
<div class="brand"><svg viewBox="0 0 64 64" aria-hidden="true">${markSvgLines()}</svg><span>anquar</span></div>
<div class="mid"><h1>${HEADLINE}</h1><p class="lede">${LEDE}</p></div>
<div class="bot"><span class="url">anquar.netlify.app</span><span class="tags">Offline<b>·</b>Private<b>·</b>On your phone</span></div>
</div></div></body></html>`;
};

function fail(msg: string): never {
	console.error(`og: ${msg}`);
	process.exit(1);
}

const work = join(tmpdir(), `anquar-og-${process.pid}`);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(work, { recursive: true });

for (const [name, { w, h }] of Object.entries(SIZES) as [
	Size,
	(typeof SIZES)[Size],
][]) {
	const html = join(work, `${name}.html`);
	const shot = join(work, `${name}.png`);
	const jpg = join(OUT, `anquar-${name}.jpg`);
	writeFileSync(html, page(name));
	execFileSync(
		process.env.CHROMIUM ?? "chromium",
		[
			"--headless=new",
			"--no-sandbox",
			"--disable-gpu",
			"--hide-scrollbars",
			"--force-device-scale-factor=1",
			"--virtual-time-budget=4000",
			`--window-size=${w},${h}`,
			`--screenshot=${shot}`,
			`file://${html}`,
		],
		{ stdio: "ignore" },
	);
	execFileSync("ffmpeg", [
		"-y",
		"-loglevel",
		"error",
		"-i",
		shot,
		"-map_metadata",
		"-1",
		"-q:v",
		"2",
		"-pix_fmt",
		"yuvj420p",
		jpg,
	]);
	const dims = execFileSync("ffprobe", [
		"-v",
		"error",
		"-select_streams",
		"v:0",
		"-show_entries",
		"stream=width,height",
		"-of",
		"csv=s=x:p=0",
		jpg,
	])
		.toString()
		.trim();
	if (dims !== `${w}x${h}`) fail(`${jpg} is ${dims}, not ${w}x${h}`);
	const bytes = statSync(jpg).size;
	if (bytes > MAX_BYTES)
		fail(`${jpg} is ${bytes} bytes; WhatsApp wants under ${MAX_BYTES}`);
	console.log(`anquar-${name}.jpg  ${w}x${h}  ${Math.round(bytes / 1024)} KB`);
}
rmSync(work, { recursive: true, force: true });
