import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GroChurch - Pastoral Renewal Platform",
  description: "A safe, confidential, and founder-led pathway for pastors to find clarity, care, and courage.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
