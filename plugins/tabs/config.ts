export interface TabItem {
  id: string;
  title: string;
  active?: boolean;
}

export interface TabsConfig {
  tabs: TabItem[];
}

export function createTab(index: number): TabItem {
  return {
    id: crypto.randomUUID(),
    title: `标签 ${index}`,
  };
}

export function normalizeTabs(value?: Partial<TabsConfig>): TabsConfig {
  const tabs = Array.isArray(value?.tabs) ? value.tabs : [];
  return {
    tabs: tabs.filter(
      (tab): tab is TabItem =>
        typeof tab?.id === "string" &&
        tab.id.trim().length > 0 &&
        typeof tab.title === "string",
    ),
  };
}

export function validTabs(tabs: readonly TabItem[]): boolean {
  return (
    tabs.length > 0 &&
    tabs.every((tab) => tab.id === tab.id.trim() && tab.title.trim().length > 0) &&
    new Set(tabs.map((tab) => tab.id)).size === tabs.length
  );
}
