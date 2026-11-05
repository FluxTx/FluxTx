"use client";

import { AnimateUIProvider } from "@animate-ui/react/provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AnimateUIProvider tempo={0.9}>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </AnimateUIProvider>
    </QueryClientProvider>
  );
}
