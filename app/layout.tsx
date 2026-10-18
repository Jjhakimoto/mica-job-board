import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jobs at MiCA-licensed crypto firms",
  description: "Open roles at crypto firms licensed under MiCA in the EU and EEA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-950 antialiased">{children}</body>
    </html>
  );
}
