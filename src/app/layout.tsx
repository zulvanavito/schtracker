import { Inter } from "next/font/google";
import "./globals.css";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Toaster } from "@/components/ui/sonner";
import { Metadata } from "next";

const inter = Inter({ subsets: ["latin"] });

import SessionMonitor from "@/components/SessionMonitor";

export const metadata: Metadata = {
  title: {
    default: 'SCH Tracker Instalasi',
    template: '%s | SCH Tracker'
  },
  description: 'Aplikasi management jadwal instalasi dengan integrasi Google Calendar dan WhatsApp',
  keywords: ['jadwal', 'instalasi', 'tracker', 'management', 'sch'],
  authors: [{ name: 'Zulvan Avito Anwari' }],
  creator: 'Zulvan Aviio Anwaru',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <SessionMonitor />
        <main>{children}</main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
