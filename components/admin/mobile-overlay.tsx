"use client";

import { useMobileMenu } from "./mobile-menu-context";

export function MobileOverlay() {
  const { open, close } = useMobileMenu();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 md:hidden"
      onClick={close}
      aria-hidden="true"
    />
  );
}
