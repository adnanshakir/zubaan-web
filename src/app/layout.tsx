import type { Metadata, Viewport } from "next"
import {
  Geist,
  Geist_Mono,
  Noto_Sans_Devanagari,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-devanagari",
  subsets: ["devanagari", "latin"],
  display: "swap",
})

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil", "latin"],
  display: "swap",
})

const notoTelugu = Noto_Sans_Telugu({
  variable: "--font-noto-telugu",
  subsets: ["telugu", "latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Zubaan",
  description: "Practice speaking English out loud.",
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoDevanagari.variable} ${notoTamil.variable} ${notoTelugu.variable} flex min-h-full flex-col`}
      >
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
