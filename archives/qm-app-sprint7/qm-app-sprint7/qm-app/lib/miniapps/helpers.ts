// =============================================================================
// Helpers de calcul pour les colonnes `computed`, les `summary` et les `controls`.
// Volontairement sans dépendance : ces fonctions tournent côté client, à chaque
// frappe, sur des tableaux de quelques dizaines de lignes. Restons simples.
// =============================================================================

import type { ComputedResult, Row, Tone } from "./schema-types";

// -----------------------------------------------------------------------------
// Valeurs
// -----------------------------------------------------------------------------

/** Chaîne nettoyée d'une cellule ("" si vide / null / undefined). */
export function str(v: unknown): string {
  return String(v ?? "").trim();
}

/** Vrai si la cellule est renseignée. */
export function has(v: unknown): boolean {
  return str(v).length > 0;
}

/** Nombre d'une cellule — accepte la virgule décimale. 0 si non numérique. */
export function num(v: unknown): number {
  const n = Number(str(v).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Nombre d'une cellule, ou null si la cellule est vide / illisible. */
export function numOrNull(v: unknown): number | null {
  if (!has(v)) return null;
  const n = Number(str(v).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : null;
}

// -----------------------------------------------------------------------------
// Dates (format ISO court "YYYY-MM-DD", celui des inputs type="date")
// -----------------------------------------------------------------------------

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parse(v: unknown): Date | null {
  const s = str(v);
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

const DAY_MS = 86_400_000;

/** Nombre de jours de `from` vers `to` (positif si `to` est après). null si invalide. */
export function daysBetween(from: unknown, to: unknown): number | null {
  const a = parse(from);
  const b = parse(to);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

/** Jours restants avant `date` (négatif si la date est passée). null si invalide. */
export function daysUntil(date: unknown): number | null {
  return daysBetween(today(), date);
}

/** Jours écoulés depuis `date` (négatif si la date est dans le futur). */
export function daysSince(date: unknown): number | null {
  return daysBetween(date, today());
}

/** Ajoute `months` mois à une date ISO. "" si invalide. */
export function addMonths(date: unknown, months: number): string {
  const d = parse(date);
  if (!d) return "";
  const target = new Date(d);
  const day = target.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}

/** Affichage court "12/03/2026". "—" si invalide. */
export function fmtDate(date: unknown): string {
  const d = parse(date);
  if (!d) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

// -----------------------------------------------------------------------------
// Horaires ("HH:MM")
// -----------------------------------------------------------------------------

/** Minutes depuis minuit pour "HH:MM". null si invalide. */
export function minutesOfDay(v: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(str(v));
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Durée en minutes entre deux "HH:MM". null si invalide, négatif si fin < début. */
export function minutesBetween(start: unknown, end: unknown): number | null {
  const a = minutesOfDay(start);
  const b = minutesOfDay(end);
  if (a === null || b === null) return null;
  return b - a;
}

/** Minutes → "3 h 30" / "45 min". */
export function fmtDuration(minutes: number): string {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m} min`;
  if (m === 0) return `${sign}${h} h`;
  return `${sign}${h} h ${String(m).padStart(2, "0")}`;
}

/** Minutes → heures décimales ("7,5"). */
export function toHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

// -----------------------------------------------------------------------------
// Agrégats
// -----------------------------------------------------------------------------

export function count(rows: Row[], fn: (row: Row) => boolean): number {
  return rows.reduce((n, r) => (fn(r) ? n + 1 : n), 0);
}

export function sum(rows: Row[], fn: (row: Row) => number): number {
  return rows.reduce((n, r) => n + fn(r), 0);
}

/** Pourcentage formaté. "—" si dénominateur nul. */
export function pct(n: number, d: number, digits = 0): string {
  if (!d) return "—";
  return `${((n / d) * 100).toFixed(digits).replace(".", ",")} %`;
}

/** Ratio brut 0..100 (0 si dénominateur nul). */
export function ratio(n: number, d: number): number {
  return d ? (n / d) * 100 : 0;
}

/** Nombre formaté en français ("1 234,5"). */
export function fmtNum(n: number, digits = 0): string {
  return n.toFixed(digits).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Valeur la plus fréquente d'une colonne (hors vides). null si aucune. */
export function mode(rows: Row[], colId: string): { value: string; n: number } | null {
  const tally = new Map<string, number>();
  for (const r of rows) {
    const v = str(r[colId]);
    if (!v) continue;
    tally.set(v, (tally.get(v) ?? 0) + 1);
  }
  let best: { value: string; n: number } | null = null;
  for (const [value, n] of tally) {
    if (!best || n > best.n) best = { value, n };
  }
  return best;
}

/** Retrouve le libellé d'une option select à partir de sa valeur. */
export function optLabel(
  options: { value: string; label: string }[],
  value: unknown,
): string {
  return options.find((o) => o.value === str(value))?.label ?? str(value);
}

/**
 * Première ligne d'une autre table dont `colId` vaut `value`.
 * Sert aux lookups inter-tables (ex: sollicitations → partenaire).
 */
export function lookup(rows: Row[] | undefined, colId: string, value: unknown): Row | null {
  const v = str(value);
  if (!v || !rows) return null;
  return rows.find((r) => str(r[colId]) === v) ?? null;
}

/** Lignes d'une autre table dont `colId` vaut `value`. */
export function lookupAll(rows: Row[] | undefined, colId: string, value: unknown): Row[] {
  const v = str(value);
  if (!v || !rows) return [];
  return rows.filter((r) => str(r[colId]) === v);
}

/** Date la plus récente d'une colonne parmi des lignes. "" si aucune. */
export function latestDate(rows: Row[], colId: string): string {
  let best = "";
  for (const r of rows) {
    const d = str(r[colId]);
    if (/^\d{4}-\d{2}-\d{2}/.test(d) && d > best) best = d;
  }
  return best;
}

// -----------------------------------------------------------------------------
// Tonalités — sucre syntaxique pour les colonnes `computed`
// -----------------------------------------------------------------------------

export const ok = (text: string): ComputedResult => ({ text, tone: "ok" });
export const warn = (text: string): ComputedResult => ({ text, tone: "warn" });
export const danger = (text: string): ComputedResult => ({ text, tone: "danger" });
export const neutral = (text: string): ComputedResult => ({ text, tone: "neutral" });

/** Cellule non calculable faute de saisie — gris, message standard. */
export const pending = (text = "À renseigner"): ComputedResult => ({
  text,
  tone: "neutral",
});

/**
 * Première règle vraie gagne (équivalent d'un SI imbriqué Excel).
 * `rules` est une liste [condition, résultat]. `fallback` si aucune ne matche.
 */
export function firstMatch(
  rules: Array<[boolean, ComputedResult]>,
  fallback: ComputedResult = pending(),
): ComputedResult {
  for (const [condition, result] of rules) {
    if (condition) return result;
  }
  return fallback;
}

/** Tonalité d'un taux : ok au-dessus de `good`, warn au-dessus de `mid`, danger sinon. */
export function toneFromRate(value: number, good: number, mid: number): Tone {
  if (value >= good) return "ok";
  if (value >= mid) return "warn";
  return "danger";
}

/** Tonalité inversée (plus c'est haut, plus c'est mauvais) — ex: taux d'abandon. */
export function toneFromRateInverse(value: number, good: number, mid: number): Tone {
  if (value <= good) return "ok";
  if (value <= mid) return "warn";
  return "danger";
}

/** Tonalité d'une échéance : rouge si dépassée, orange si proche, vert sinon. */
export function toneFromDeadline(date: unknown, warnDays = 90): Tone {
  const d = daysUntil(date);
  if (d === null) return "neutral";
  if (d < 0) return "danger";
  if (d <= warnDays) return "warn";
  return "ok";
}

/** Libellé standard d'échéance : "Expiré depuis 12 j" / "Dans 45 j" / "—". */
export function deadlineLabel(date: unknown, warnDays = 90): ComputedResult {
  const d = daysUntil(date);
  if (d === null) return pending("Date manquante");
  if (d < 0) return danger(`Expiré depuis ${Math.abs(d)} j`);
  if (d <= warnDays) return warn(`Échéance dans ${d} j`);
  return ok(`Valide · ${d} j`);
}
