import { useRef, useState } from "react";
import { view } from "@pc-nexus/bridge";
import { NxBlockContent, NxTab, NxTabs, useConfig } from "@pc-nexus/react";
import { normalizeTabs, type TabsConfig } from "../config";

export function App() {
  const liveConfig = useConfig<TabsConfig>();
  const { tabs } = normalizeTabs(liveConfig);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pendingSubmit = useRef<Promise<void>>(Promise.resolve());

  if (tabs.length === 0) return null;

  const defaultIndex = Math.max(tabs.findIndex((tab) => tab.active), 0);
  const selectedIndex = tabs.findIndex((tab) => tab.id === activeId);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : defaultIndex;

  function changeTab(index: number) {
    const selected = tabs[index];
    if (!selected || index === activeIndex) return;
    setActiveId(selected.id);

    const config: TabsConfig = {
      tabs: tabs.map((tab) => ({
        ...tab,
        active: tab.id === selected.id,
      })),
    };
    pendingSubmit.current = pendingSubmit.current
      .then(() => view.submit({ config }))
      .then(() => undefined)
      .catch((error) => {
        console.warn("Failed to save active tab", error);
      });
  }

  return (
    <>
      <NxTabs activeTab={activeIndex} onActiveTabChange={changeTab}>
        {tabs.map((tab) => (
          <NxTab key={tab.id} title={tab.title} />
        ))}
      </NxTabs>
      {tabs.map((tab, index) => (
        <NxBlockContent
          key={tab.id}
          contentId={tab.id}
          className={index === activeIndex ? "" : "hidden"}
        />
      ))}
    </>
  );
}
