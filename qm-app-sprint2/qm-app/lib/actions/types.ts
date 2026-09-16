// =============================================================================
// Type de retour standard pour les Server Actions.
// Permet d'avoir un typage cohérent : { ok: true, data? } | { ok: false, error }
// =============================================================================
export type ActionResult<TData = void> =
  | (TData extends void ? { ok: true } : { ok: true; data: TData })
  | { ok: false; error: string };
