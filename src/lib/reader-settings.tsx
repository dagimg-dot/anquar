import {
  createContext,
  createSignal,
  type ParentComponent,
  useContext,
} from "solid-js";

export interface ReaderSettings {
  bgColor: string; // CSS color value
  fontSize: number; // percentage (100 = 1rem base)
  hPadding: number; // horizontal padding in rem
  lineHeight: number; // unitless multiplier
  textColor: string; // CSS color value
}

const DEFAULTS: ReaderSettings = {
  fontSize: 100,
  lineHeight: 1.7,
  hPadding: 1.5,
  textColor: "",
  bgColor: "",
};

interface ReaderSettingsContextValue {
  resetSettings: () => void;
  setSettings: (updates: Partial<ReaderSettings>) => void;
  settings: () => ReaderSettings;
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

  return (
    <ReaderSettingsCtx.Provider
      value={{ settings, setSettings: updateSettings, resetSettings }}
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
