import type { Metadata } from "next";
import { Raleway, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-theme="dark" className={`${raleway.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            classNames: {
              toast:
                "bg-card border-border text-foreground backdrop-blur-xl shadow-[0_8px_30px_-8px_rgba(0,0,0,0.3)]",
            },
          }}
        />
      </body>
    </html>
  );
}
