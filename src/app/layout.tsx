import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LabelX",
  description: "Internal media asset automation tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
