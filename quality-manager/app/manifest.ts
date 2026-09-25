import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quality Manager — LS Compétences",
    short_name: "Quality Manager",
    description:
      "Votre consultant Qualiopi intégré, disponible 24/7. SaaS RNQ V9 pour organismes de formation et CFA.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#03040A",
    theme_color: "#7C4DFF",
    lang: "fr",
    icons: [
      { src: "/brand/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/brand/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { src: "/brand/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/app-icon-dark-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
