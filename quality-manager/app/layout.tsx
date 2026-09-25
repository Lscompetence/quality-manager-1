import type { Metadata, Viewport } from "next";
import { Raleway, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600"],
  variable: "--font-raleway",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Quality Manager",
    template: "%s · Quality Manager",
  },
  description: "Votre consultant Qualiopi intégré, disponible 24/7. SaaS RNQ V9 pour OF et CFA.",
  applicationName: "Quality Manager",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    title: "Quality Manager",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Quality Manager — LS Compétences",
    description: "L'audit Qualiopi n'est plus un cauchemar.",
    siteName: "Quality Manager",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/brand/quality-manager-logo-dark.png", width: 1060, height: 180 }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#03040A" },
    { media: "(prefers-color-scheme: light)", color: "#BFD9F0" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="dark" className={`${raleway.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        {/* Fond aurore des maquettes : 7 couleurs en dérive lente, voile + grain */}
        <div className="aurora-stage" aria-hidden="true">
          <div className="aurora-canvas" />
          <div className="aurora-veil" />
          <div className="aurora-grain" />
        </div>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
