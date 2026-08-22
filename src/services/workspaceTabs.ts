import { useSyncExternalStore } from "react";

export type WorkspaceTab = {
  id: string;
  label: string;
};

type Snapshot = {
  tabs: WorkspaceTab[];
  /** Pedido pendiente de activar (AppShell lo consume). */
  focusId: string | null;
};

const PADRON_ITEMS: WorkspaceTab = {
  id: "padron-items",
  label: "Padrón de Items",
};

let tabs: WorkspaceTab[] = [];
let focusId: string | null = null;
let snapshot: Snapshot = { tabs, focusId: null };
const listeners = new Set<() => void>();

function emit(): void {
  snapshot = { tabs: [...tabs], focusId };
  for (const listener of listeners) listener();
}

function getSnapshot(): Snapshot {
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useWorkspaceTabs(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function openWorkspaceTab(tab: WorkspaceTab): void {
  if (!tabs.some((item) => item.id === tab.id)) {
    tabs = [...tabs, tab];
  }
  focusId = tab.id;
  emit();
}

export function openPadronItemsTab(): void {
  // Prefetch del chunk mientras se monta la pestaña.
  void import("../components/ProductosDialog/ProductosDialog");
  openWorkspaceTab(PADRON_ITEMS);
}

export function closeWorkspaceTab(id: string): void {
  const next = tabs.filter((tab) => tab.id !== id);
  if (next.length === tabs.length) return;
  tabs = next;
  if (focusId === id) focusId = null;
  emit();
}

/** AppShell marca el focus como consumido tras activar la pestaña. */
export function clearWorkspaceTabFocus(): void {
  if (focusId == null) return;
  focusId = null;
  emit();
}

export function isWorkspaceTabOpen(id: string): boolean {
  return tabs.some((tab) => tab.id === id);
}
