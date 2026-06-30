/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App.tsx";
import { ThemeProvider } from "./theme/ThemeContext.tsx";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

render(
  () => (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  ),
  root
);
