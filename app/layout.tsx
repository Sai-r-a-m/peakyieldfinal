import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PeakYield — Dynamic Hotel Pricing",
  description: "AI-powered dynamic pricing for hotel revenue managers. Real competitor data, transparent math.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
