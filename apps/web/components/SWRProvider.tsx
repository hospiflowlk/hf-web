"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

// Maintain a single cache instance outside the component to survive React strict mode or re-renders
const swrCache = new Map();

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => swrCache }}>
      {children}
    </SWRConfig>
  );
}
