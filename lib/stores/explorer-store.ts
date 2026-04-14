import { create } from "zustand";

export type DateFilter = "all" | "today" | "tomorrow" | "weekend" | "week" | string;

type ExplorerStore = {
  selectedSessionId: string | null;
  hoveredSessionId: string | null;
  activeTcg: string | null;
  activeFormat: string | null;
  activePowerLevel: number | null;
  searchQuery: string;
  dateFilter: DateFilter;
  /** Minutes from midnight, e.g. 840 = 14:00. null = no filter. */
  fromMinutes: number | null;
  shopOnly: boolean;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setTcgFilter: (tcg: string | null) => void;
  setFormatFilter: (format: string | null) => void;
  setPowerLevelFilter: (level: number | null) => void;
  setSearchQuery: (q: string) => void;
  setDateFilter: (f: DateFilter) => void;
  setFromMinutes: (m: number | null) => void;
  toggleShopOnly: () => void;
};

export const useExplorerStore = create<ExplorerStore>((set) => ({
  selectedSessionId: null,
  hoveredSessionId: null,
  activeTcg: null,
  activeFormat: null,
  activePowerLevel: null,
  searchQuery: "",
  dateFilter: "all",
  fromMinutes: null,
  shopOnly: false,
  setSelected: (id) => set({ selectedSessionId: id }),
  setHovered: (id) => set({ hoveredSessionId: id }),
  setTcgFilter: (tcg) => set({ activeTcg: tcg, activeFormat: null, activePowerLevel: null }),
  setFormatFilter: (format) => set({ activeFormat: format, activePowerLevel: null }),
  setPowerLevelFilter: (level) => set({ activePowerLevel: level }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setDateFilter: (f) => set({ dateFilter: f }),
  setFromMinutes: (m) => set({ fromMinutes: m }),
  toggleShopOnly: () => set((s) => ({ shopOnly: !s.shopOnly })),
}));
