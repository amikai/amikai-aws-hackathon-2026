import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "股伴的小屋",
  description: "市場越激動，介面越安定",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="bg-[#FBF7EF] text-[#5B5348] antialiased">{children}</body>
    </html>
  );
}
