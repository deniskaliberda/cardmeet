import { create } from "zustand";

export type DateFilter = "all" | "today" | "tomorrow" | "weekend" | "week" | string; // string = "YYYY-MM-DD"

type ExplorerStore = {
  selectedSessionId: string | null;
  hoveredSessionId: string | null;
  activeTcg: string | null;
  dateFilter: DateFilter;
  /** Minutes from midnight, e.g. 840 = 14:00. null = no filter. */
  fromMinutes: number | null;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setTcgFilter: (tcg: string | null) => void;
  setDateFilter: (f: DateFilter) => void;
  setFromMinutes: (m: number | null) => void;
};

export const useExplorerStore = create<ExplorerStore>((set) => ({
  selectedSessionId: null,
  hoveredSessionId: null,
  activeTcg: null,
  dateFilter: "all",
  fromMinutes: null,
  setSelected: (id) => set({ selectedSessionId: id }),
  setHovered: (id) => set({ hoveredSessionId: id }),
  setTcgFilter: (tcg) => set({ activeTcg: tcg }),
  setDateFilter: (f) => set({ dateFilter: f }),
  setFromMinutes: (m) => set({ fromMinutes: m }),
}));
