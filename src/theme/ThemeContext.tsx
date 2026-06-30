import {
  type Accessor,
  createContext,
  createSignal,
  type ParentComponent,
  type Setter,
  useContext,
} from "solid-js";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  effective: Accessor<"light" | "dark">;
  mode: Accessor<ThemeMode>;
  setMode: Setter<ThemeMode>;
}

const ThemeContext = createContext<ThemeContextValue>();

function getInitialMode(): ThemeMode {
  if ("theme" in localStorage) {
    return localStorage.theme as ThemeMode;
  }
  return "system";
}

function resolveEffective(m: ThemeMode): "light" | "dark" {
  if (m !== "system") {
    return m;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: ThemeMode): "light" | "dark" {
  const root = document.documentElement;
  const effective = resolveEffective(mode);

  if (mode === "system") {
    localStorage.removeItem("theme");
  } else {
    localStorage.theme = mode;
  }

  root.setAttribute("data-theme", effective);
  return effective;
}

export const ThemeProvider: ParentComponent = (props) => {
  const [mode, setMode] = createSignal<ThemeMode>(getInitialMode());
  const [effective, setEffective] = createSignal<"light" | "dark">(
    resolveEffective(getInitialMode())
  );

  const handleSetMode = (
    next: ThemeMode | ((prev: ThemeMode) => ThemeMode)
  ) => {
    const resolved = typeof next === "function" ? next(mode()) : next;
    setMode(resolved);
    setEffective(applyTheme(resolved));
  };

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", (e) => {
    if (mode() === "system") {
      const next = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      setEffective(next);
    }
  });

  return (
    <ThemeContext.Provider value={{ mode, setMode: handleSetMode, effective }}>
      {props.children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
