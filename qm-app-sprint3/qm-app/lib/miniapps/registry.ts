import type { MiniAppSchema } from "./schema-types";
import { tableauVeilleSchema } from "./schemas/tableau-veille";
import { annuaireHandicapSchema } from "./schemas/annuaire-handicap";
import { mobilitesCfaSchema } from "./schemas/mobilites-cfa";
import { crReunionsSchema } from "./schemas/cr-reunions";
import { correspondanceRncpSchema } from "./schemas/correspondance-rncp";
import { accompagnementApprentisSchema } from "./schemas/accompagnement-apprentis";

/**
 * Registre central des mini-apps.
 * Pour ajouter une mini-app : créer son schema dans `schemas/`,
 * puis l'enregistrer ici.
 */
const REGISTRY: Record<string, MiniAppSchema> = {
  "tableau-veille": tableauVeilleSchema,
  "annuaire-handicap": annuaireHandicapSchema,
  "mobilites-cfa": mobilitesCfaSchema,
  "cr-reunions": crReunionsSchema,
  "correspondance-rncp": correspondanceRncpSchema,
  "accompagnement-apprentis": accompagnementApprentisSchema,
};

export function getMiniAppSchema(key: string): MiniAppSchema | null {
  return REGISTRY[key] ?? null;
}

export function listMiniAppKeys(): string[] {
  return Object.keys(REGISTRY);
}

export function listMiniAppSchemas(): MiniAppSchema[] {
  return Object.values(REGISTRY);
}
