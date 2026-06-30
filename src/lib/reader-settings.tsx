import {
  createContext,
  createSignal,
  type ParentComponent,
  useContext,
} from "solid-js";

export interface ReaderTheme {
  bgColor: string;
  id: string;
  label: string;
  textColor: string;
}

export const READER_THEMES: ReaderTheme[] = [
  { id: "light", label: "Light", textColor: "#1a1a1a", bgColor: "#ffffff" },
  { id: "dark", label: "Dark", textColor: "#e0e0e0", bgColor: "#1a1a1a" },
  { id: "sepia", label: "Sepia", textColor: "#5b4636", bgColor: "#f1e8d0" },
  { id: "cream", label: "Cream", textColor: "#3c3836", bgColor: "#fbf1c7" },
  { id: "amoled", label: "AMOLED", textColor: "#ffffff", bgColor: "#000000" },
];

export interface ReaderSettings {
  bgColor: string; // CSS color value (empty = use theme default)
  fontSize: number; // percentage (100 = 1rem base)
  hPadding: number; // horizontal padding in rem
  lineHeight: number; // unitless multiplier
  textColor: string; // CSS color value (empty = use theme default)
  themeId: string; // selected preset theme id
}

const DEFAULTS: ReaderSettings = {
  fontSize: 100,
  lineHeight: 1.7,
  hPadding: 1.5,
  textColor: "",
  bgColor: "",
  themeId: "light",
};

export function getThemeColors(settings: ReaderSettings): {
  textColor: string;
  bgColor: string;
} {
  const theme = READER_THEMES.find((t) => t.id === settings.themeId);
  return {
    textColor: settings.textColor || theme?.textColor || "#1a1a1a",
    bgColor: settings.bgColor || theme?.bgColor || "#ffffff",
  };
}

interface ReaderSettingsContextValue {
  resetSettings: () => void;
  setSettings: (updates: Partial<ReaderSettings>) => void;
  settings: () => ReaderSettings;
  themeColors: () => { textColor: string; bgColor: string };
}

const ReaderSettingsCtx = createContext<ReaderSettingsContextValue>();

export const ReaderSettingsProvider: ParentComponent = (props) => {
  const [settings, setSettings] = createSignal<ReaderSettings>({ ...DEFAULTS });

  const updateSettings = (updates: Partial<ReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings({ ...DEFAULTS });
  };

  const themeColors = () => getThemeColors(settings());

  return (
    <ReaderSettingsCtx.Provider
      value={{
        settings,
        setSettings: updateSettings,
        resetSettings,
        themeColors,
      }}
    >
      {props.children}
    </ReaderSettingsCtx.Provider>
  );
};

export function useReaderSettings(): ReaderSettingsContextValue {
  const ctx = useContext(ReaderSettingsCtx);
  if (!ctx) {
    throw new Error(
      "useReaderSettings must be used within ReaderSettingsProvider"
    );
  }
  return ctx;
}
