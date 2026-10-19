import { useEffect, useState } from "react";
import { events, view } from "@pc-nexus/bridge";
import {
  DEFAULT_BUTTON,
  type ButtonConfig,
} from "../../../plugins/button/config";
import { ButtonSurface } from "./ButtonSurface";
import { Editor } from "./Editor";
import "./style.css";

type EntryData = {
  config?: Partial<ButtonConfig>;
  entry?: { mode?: "view" | "edit" };
};
type ConfigChanged = { config?: Partial<ButtonConfig> };
const CONFIG_CHANGED = "NEXUS_EXTENSION_DATA_CONFIG_CHANGED";

function fullConfig(value?: Partial<ButtonConfig>): ButtonConfig {
  return { ...DEFAULT_BUTTON, ...value };
}

export default function App() {
  const [mode, setMode] = useState<"view" | "edit" | null>(null);
  const [config, setConfig] = useState<ButtonConfig>(fullConfig());
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void view
      .getContext<EntryData>()
      .then((context) => {
        if (!active) return;
        setMode(context.extension.data.entry?.mode ?? "view");
        setConfig(fullConfig(context.extension.data.config));
        if (context.extension.data.entry?.mode !== "edit") {
          void events
            .on<ConfigChanged>(CONFIG_CHANGED, (payload) => {
              if (active) setConfig(fullConfig(payload?.config));
            })
            .then((subscription) => {
              unsubscribe = () => subscription.unsubscribe();
            });
        }
      })
      .catch(() => {
        if (active) setMode("edit");
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  if (mode === null) return <div className="loading">正在加载按钮…</div>;
  if (mode === "view")
    return (
      <div className="viewer">
        <ButtonSurface config={config} navigate />
      </div>
    );
  return <Editor initialConfig={config} />;
}
