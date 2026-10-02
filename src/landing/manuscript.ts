import { MOBY_DICK } from "./sample.ts";

const SETTLE_MS = 1000;

// Behind the hero, the opening of Moby-Dick in faint columns, drifting upward like a feed. It thins to a
// sixth behind the hero's copy, wherever the layout has put that, measured once the copy has risen in.
export function mountManuscript(el: HTMLElement, copy: HTMLElement) {
	const page = `<div class="ms-cols">${MOBY_DICK.paragraphs.map((p) => `<p>${p}</p>`).join("")}</div>`;
	el.innerHTML = `<div class="ms-track">${page}${page}</div>`;

	const clear = () => {
		const box = el.getBoundingClientRect();
		const c = copy.getBoundingClientRect();
		const x = Math.round(c.left - box.left + c.width / 2);
		const y = Math.round(c.top - box.top + c.height / 2);
		el.style.setProperty(
			"--copy-clear",
			`radial-gradient(ellipse ${Math.round(c.width * 0.68)}px ${Math.round(c.height * 0.72)}px at ${x}px ${y}px, rgba(0,0,0,0.16) 45%, #000 100%)`,
		);
	};
	clear();
	void document.fonts?.ready.then(clear);
	window.setTimeout(clear, SETTLE_MS);
	let pending = 0;
	addEventListener("resize", () => {
		clearTimeout(pending);
		pending = window.setTimeout(clear, 150);
	});
}
