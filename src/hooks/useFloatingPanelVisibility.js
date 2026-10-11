'use client';

import { useEffect, useState } from 'react';

const VISIBILITY_EVENT = 'belorella:floating-panel-visibility';

export const publishFloatingPanelVisibility = (name, open) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VISIBILITY_EVENT, { detail: { name, open: Boolean(open) } }));
};

export default function useFloatingPanelVisibility() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    const openPanels = new Set();
    const handleVisibility = (event) => {
      const { name, open } = event.detail || {};
      if (!name) return;
      if (open) openPanels.add(name);
      else openPanels.delete(name);
      setIsPanelOpen(openPanels.size > 0);
    };

    window.addEventListener(VISIBILITY_EVENT, handleVisibility);
    return () => window.removeEventListener(VISIBILITY_EVENT, handleVisibility);
  }, []);

  return isPanelOpen;
}
