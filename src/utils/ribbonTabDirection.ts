import type { RibbonTabId } from "../data/ribbon";
import { ribbonTabs } from "../data/ribbon";

export type RibbonAnimDirection = -1 | 0 | 1;

export function getRibbonTabDirection(from: RibbonTabId, to: RibbonTabId): RibbonAnimDirection {
  const fromIdx = ribbonTabs.findIndex((tab) => tab.id === from);
  const toIdx = ribbonTabs.findIndex((tab) => tab.id === to);
  if (toIdx > fromIdx) return 1;
  if (toIdx < fromIdx) return -1;
  return 0;
}
