"use client";

import { createContext, useContext, useState } from "react";

type DmTarget = {
  id: string;
  username: string;
  avatar_url?: string | null;
} | null;

type DmContextType = {
  dmTarget: DmTarget;
  openDm: (target: DmTarget) => void;
  clearDmTarget: () => void;
};

const DmContext = createContext<DmContextType | null>(null);

export function DmProvider({ children }: { children: React.ReactNode }) {
  const [dmTarget, setDmTarget] = useState<DmTarget>(null);

  return (
    <DmContext.Provider
      value={{
        dmTarget,
        openDm: setDmTarget,
        clearDmTarget: () => setDmTarget(null),
      }}
    >
      {children}
    </DmContext.Provider>
  );
}

export function useDm() {
  const ctx = useContext(DmContext);
  if (!ctx) throw new Error("useDm must be used within DmProvider");
  return ctx;
}
