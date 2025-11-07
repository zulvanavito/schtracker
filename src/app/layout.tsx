import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // File CSS global Anda
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

// ... sisa file Anda ...
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <main>{children}</main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
