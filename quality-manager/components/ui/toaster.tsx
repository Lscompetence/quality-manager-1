"use client";

import * as React from "react";
import { Toaster as Sonner } from "sonner";

/**
 * Messages de l'application (enregistrement, dépôt, suppression, erreur).
 *
 * L'ancien Toaster était figé en thème sombre : en mode jour, il écrivait
 * en blanc sur un fond clair semi-transparent, illisible. Celui-ci suit
 * `data-theme`, a un fond opaque, et chaque type de message sa couleur.
 */
export function Toaster() {
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");
    sync();
    // La bascule de thème modifie l'attribut : on suit ses changements.
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      position="top-right"
      theme={theme}
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast: "qm-toast",
          title: "qm-toast-title",
          description: "qm-toast-description",
          closeButton: "qm-toast-close",
          actionButton: "qm-toast-action",
          success: "qm-toast-success",
          error: "qm-toast-error",
          warning: "qm-toast-warning",
          info: "qm-toast-info",
        },
      }}
    />
  );
}
