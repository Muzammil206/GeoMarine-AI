import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Nigeria Maritime Intelligence | Port Activity Monitor",
  description:
    "AI-powered maritime intelligence platform monitoring vessel activity across major Nigerian ports using Sentinel-1 SAR satellite imagery.",
  keywords: [
    "maritime intelligence",
    "Nigeria ports",
    "vessel detection",
    "SAR satellite",
    "port monitoring",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main
            style={{
              flex: 1,
              marginLeft: 240,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Header />
            <div style={{ flex: 1, padding: "28px 36px", overflow: "auto" }}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
