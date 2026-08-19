import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { COMPANY } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Techadox Integrated Field Coordinator Portal",
  description: `${COMPANY.name} — ${COMPANY.tagline} Field service dispatch, reporting, invoicing, and accounts.`,
  keywords: ["Techadox", "Field Coordinator", "Dispatch", "Work Orders", "Invoicing", COMPANY.developer],
  authors: [{ name: "Clintus Victoriya" }],
  icons: {
    icon: "/techadox-logo.png",
    shortcut: "/techadox-logo.png",
    apple: "/techadox-logo.png",
  },
  openGraph: {
    title: "Techadox Integrated Field Coordinator Portal",
    description: `${COMPANY.tagline} Field service dispatch, reporting, invoicing, and accounts.`,
    siteName: COMPANY.name,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
