/* @refresh reload */
import "./splash.ts";
import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import App from "./App.tsx";
import { animateBackFromReader } from "./lib/transitions.ts";
import { ThemeProvider } from "./theme/ThemeContext.tsx";
import "./index.css";

// Before the router starts, so back out of the reader is heard first (lib/transitions.ts).
animateBackFromReader();

const root = document.getElementById("root");

if (!root) {
	throw new Error("Root element not found");
}

render(
	() => (
		<ThemeProvider>
			<Router>
				<Route component={App} path="/" />
				<Route component={App} path="/book/:id" />
			</Router>
		</ThemeProvider>
	),
	root,
);
