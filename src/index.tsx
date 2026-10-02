/* @refresh reload */
import "./splash.ts";
// Chrome's install offer comes once and early, so it's listened for before anything else (lib/install.ts).
import "./lib/install.ts";
import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import App from "./App.tsx";
import { BOOK_ROUTE, HOME } from "./lib/routes.ts";
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
				<Route component={App} path={HOME} />
				<Route component={App} path={BOOK_ROUTE} />
			</Router>
		</ThemeProvider>
	),
	root,
);
