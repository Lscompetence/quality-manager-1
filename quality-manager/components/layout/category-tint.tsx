"use client";

import * as React from "react";

/**
 * Teinte le fond aurore selon la catégorie du dossier ouvert, comme la maquette
 * qui pose `data-cat` sur le body. Ici l'attribut est posé sur <html> parce que
 * l'aurore vit dans la mise en page racine, au-dessus de la page.
 */
export function CategoryTint({ category }: { category: string | null }) {
  React.useEffect(() => {
    const root = document.documentElement;
    if (category) root.setAttribute("data-cat", category);
    else root.removeAttribute("data-cat");

    return () => root.removeAttribute("data-cat");
  }, [category]);

  return null;
}
