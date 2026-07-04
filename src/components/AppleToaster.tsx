import { Toaster } from "solid-toast";

export default function AppleToaster() {
	return (
		<Toaster
			gutter={8}
			position="top-center"
			toastOptions={{
				duration: 3000,
				className: "liquid-glass apple-toast",
				style: {
					background: "var(--color-glass-bg)",
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
