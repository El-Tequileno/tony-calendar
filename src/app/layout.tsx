import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Tony Calendar",
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
