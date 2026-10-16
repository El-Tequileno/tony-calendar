import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME } from "@/lib/brand";
export const metadata: Metadata = {
  title: APP_NAME,
  description:
    "A shared planning workspace for visits, events, and provincial tender calls.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
