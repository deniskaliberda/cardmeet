import { create } from "zustand";

type ExplorerStore = {
  selectedSessionId: string | null;
  hoveredSessionId: string | null;
  activeTcg: string | null;
  setSelected: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  setTcgFilter: (tcg: string | null) => void;
};

export const useExplorerStore = create<ExplorerStore>((set) => ({
  selectedSessionId: null,
  hoveredSessionId: null,
  activeTcg: null,
  setSelected: (id) => set({ selectedSessionId: id }),
  setHovered: (id) => set({ hoveredSessionId: id }),
  setTcgFilter: (tcg) => set({ activeTcg: tcg }),
}));
