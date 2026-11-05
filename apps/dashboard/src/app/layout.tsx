import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "FluxTx — Payments in Motion",
  description: "Open-source, non-custodial blockchain payment infrastructure."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>
          <div className="min-h-full">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
