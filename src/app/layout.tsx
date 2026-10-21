import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "OpenHall — Self-Hosted Examination Platform",
  description: "Self-hosted webserver for creating and conducting examinations with strict integrity and zero-trust delivery.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-brand-green/20">
        {children}
      </body>
    </html>
  );
}
