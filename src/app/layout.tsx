import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono, Unbounded } from "next/font/google";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

// Tandem type: Unbounded (display), Archivo (UI text), Martian Mono (numbers).
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: "variable" });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const martian = Martian_Mono({ variable: "--font-martian", subsets: ["latin"], weight: "variable" });

export const metadata: Metadata = {
  title: "Tandem",
  description: "Our training plans, cycles and progress.",
  appleWebApp: { capable: true, title: "Tandem", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e10" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${unbounded.variable} ${archivo.variable} ${martian.variable}`}>
      <body className="min-h-dvh">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
