import { getApplicableIndicators, type Category } from "@/lib/constants/rnq";
import { listMiniAppSchemas } from "@/lib/miniapps/registry";

/**
 * Mini-apps pertinentes pour un dossier : au moins un de leurs indicateurs
 * s'applique à ses catégories, et leurs propres catégories éventuelles
 * recoupent celles du dossier (le registre EPI ne sort pas sur un dossier AF
 * seul, par exemple). Même règle côté admin et côté client.
 */
export function getApplicableMiniApps(categories: Category[]) {
  const applicableCodes = new Set(getApplicableIndicators(categories).map((i) => i.code));
  return listMiniAppSchemas().filter((m) => {
    if (!m.indicators.some((c) => applicableCodes.has(c))) return false;
    if (!m.categories || m.categories.length === 0) return true;
    return m.categories.some((c) => categories.includes(c));
  });
}
