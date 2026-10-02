import { Toaster } from "solid-toast";

// Over a reader page in any of its themes as much as over the app, so the glass is nearly solid and the ink is
// set here: solid-toast's own dark grey would win over the class, and vanish in the dark theme.
export default function AppleToaster() {
	return (
		<Toaster
			gutter={8}
			position="top-center"
			toastOptions={{
				duration: 3000,
				className: "liquid-glass apple-toast",
				style: {
					background:
						"color-mix(in oklab, var(--color-surface-elevated) 92%, transparent)",
					color: "var(--color-ink)",
					"box-shadow": "0 8px 32px var(--color-glass-shadow)",
					"border-radius": "14px",
					padding: "12px 16px",
					"max-width": "min(22rem, calc(100vw - 2rem))",
					width: "min(22rem, calc(100vw - 2rem))",
				},
			}}
		/>
	);
}
