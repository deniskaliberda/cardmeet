import { create } from "zustand";

export type DateFilter = "all" | "today" | "tomorrow" | "weekend" | "week" | string; // string = "YYYY-MM-DD"
export type TimeFilter = "any" | "morning" | "afternoon" | "evening";

type ExplorerStore = {
  selectedSessionId: string | null;
  hoveredSessionId: string | null;
  activeTcg: string | null;
  dateFilter: DateFilter;
  timeFilter: TimeFilter;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setTcgFilter: (tcg: string | null) => void;
  setDateFilter: (f: DateFilter) => void;
  setTimeFilter: (f: TimeFilter) => void;
};

export const useExplorerStore = create<ExplorerStore>((set) => ({
  selectedSessionId: null,
  hoveredSessionId: null,
  activeTcg: null,
  dateFilter: "all",
  timeFilter: "any",
  setSelected: (id) => set({ selectedSessionId: id }),
  setHovered: (id) => set({ hoveredSessionId: id }),
  setTcgFilter: (tcg) => set({ activeTcg: tcg }),
  setDateFilter: (f) => set({ dateFilter: f }),
  setTimeFilter: (f) => set({ timeFilter: f }),
}));
