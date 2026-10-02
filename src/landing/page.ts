import { fitPhones } from "./phone.ts";

const root = document.documentElement;
const dark = matchMedia("(prefers-color-scheme: dark)");

// The page and the app share an origin, so the toggle keeps the app's own setting (ThemeContext): "light" or
// "dark", or nothing for the system's.
const isDark = () =>
	root.dataset.theme ? root.dataset.theme === "dark" : dark.matches;

function setUpTheme(toggle: HTMLElement) {
	const sync = () => {
		root.dataset.dark = String(isDark());
		toggle.setAttribute(
			"aria-label",
			isDark() ? "Switch to light theme" : "Switch to dark theme",
		);
	};
	toggle.addEventListener("click", () => {
		const next = isDark() ? "light" : "dark";
		root.dataset.theme = next;
		try {
			localStorage.setItem("theme", next);
		} catch {}
		sync();
	});
	dark.addEventListener("change", sync);
	sync();
}

// The nav takes a hairline once the page has left the top.
function setUpNav(nav: HTMLElement) {
	const top = document.createElement("span");
	top.className = "top-sentinel";
	document.body.prepend(top);
	new IntersectionObserver(([entry]) => {
		nav.classList.toggle("scrolled", !entry.isIntersecting);
	}).observe(top);
}

// Sections ease in as they arrive, siblings a beat apart.
function setUpReveal() {
	const reveal = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				entry.target.classList.add("in");
				reveal.unobserve(entry.target);
			}
		},
		{ rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
	);
	for (const el of document.querySelectorAll<HTMLElement>("[data-reveal]")) {
		const siblings = [...(el.parentElement?.children ?? [])].filter((s) =>
			s.hasAttribute("data-reveal"),
		);
		el.style.setProperty("--d", `${siblings.indexOf(el) * 80}ms`);
		reveal.observe(el);
	}
}

export function setUpPage() {
	const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
	if (toggle) setUpTheme(toggle);
	const nav = document.querySelector<HTMLElement>(".nav");
	if (nav) setUpNav(nav);
	setUpReveal();
	fitPhones();
	addEventListener("resize", fitPhones);
}
