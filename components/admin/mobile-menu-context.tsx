"use client";

import { createContext, useContext, useState } from "react";

const MobileMenuCtx = createContext({ open: false, toggle: () => {}, close: () => {} });

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileMenuCtx.Provider value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false) }}>
      {children}
    </MobileMenuCtx.Provider>
  );
}

export const useMobileMenu = () => useContext(MobileMenuCtx);
