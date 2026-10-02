import { markSvgLines } from "../brand/mark.ts";

export const icon = (name: string, className = "ic") =>
	`<svg class="${className}" aria-hidden="true"><use href="/landing/icons.svg#i-${name}"/></svg>`;

export const markSVG = (className: string) =>
	`<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true">${markSvgLines()}</svg>`;

const statusBar = (time: string) =>
	`<div class="status"><span>${time}</span><span class="status-icons">${icon("cell-signal-full-fill")}${icon("wifi-high-fill")}${icon("battery-high-fill")}</span></div>`;

// An Android phone around a screen: the screen is drawn at 390x844 and the phone is zoomed to its column.
export const device = (screen: {
	className?: string;
	label: string;
	time: string;
	body: string;
}) =>
	`<div class="device"><div class="screen ${screen.className ?? ""}" role="group" aria-label="${screen.label}"><span class="punch"></span>${statusBar(screen.time)}${screen.body}</div></div>`;

const DEVICE_WIDTH = 412;
const DEVICE_HEIGHT = 866;
const NAV_HEIGHT = 68;

// The hero's phone also fits the window's height, so the whole phone shows beside the headline.
export function fitPhones() {
	const narrow = innerWidth < 900;
	for (const holder of document.querySelectorAll<HTMLElement>("[data-phone]")) {
		const device = holder.querySelector<HTMLElement>(".device");
		if (!device) continue;
		const width = holder.parentElement?.clientWidth || holder.clientWidth;
		const hero = holder.dataset.phone === "feed";
		let zoom = Math.min(width / DEVICE_WIDTH, hero ? 0.86 : 0.8);
		if (hero && !narrow)
			zoom = Math.min(zoom, (innerHeight - NAV_HEIGHT - 72) / DEVICE_HEIGHT);
		if (narrow) zoom = Math.min(zoom, 0.8);
		device.style.zoom = Math.max(0.5, zoom).toFixed(3);
	}
}
