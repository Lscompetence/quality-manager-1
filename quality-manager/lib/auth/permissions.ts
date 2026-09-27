// =============================================================================
// Permissions — règles métier pures (sprint 8)
//
// Miroir, côté écran, de ce que la base impose (RLS) : on n'affiche pas une
// action que la base refuserait. La base reste la seule garantie.
// =============================================================================

export type MemberRole = "admin" | "editor" | "reader";
export type SubscriptionStatus = "active" | "suspended" | "cancelled";
export type RequestKind = "ouverture_compte" | "reclamation" | "suggestion" | "support" | "autre";
export type RequestStatus = "a_traiter" | "traite";

export const ROLE_LABEL: Record<MemberRole, string> = {
  admin: "Admin",
  editor: "Responsable pédagogique",
  reader: "Lecteur",
};

export const ROLE_DESCRIPTION: Record<MemberRole, string> = {
  admin: "Pilote l’organisation : établissements, accès, abonnement. Consulte les dossiers.",
  editor: "Gère le dossier Qualiopi de l’établissement : remplit, dépose les preuves.",
  reader: "Consulte le dossier de l’établissement, sans rien modifier.",
};

export const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  active: "Actif",
  suspended: "Suspendu",
  cancelled: "Résilié",
};

export const REQUEST_KIND_LABEL: Record<RequestKind, string> = {
  ouverture_compte: "Ouverture de compte",
  reclamation: "Réclamation",
  suggestion: "Suggestion d’amélioration",
  support: "Demande d’aide",
  autre: "Autre",
};

/** Seul le responsable pédagogique produit le dossier. */
export function canWriteDossier(role: MemberRole): boolean {
  return role === "editor";
}

/** Admin et reader consultent. */
export function isDossierReadOnly(role: MemberRole): boolean {
  return !canWriteDossier(role);
}

/** Établissements, accès, abonnement, paramètres : l'admin. */
export function canManageOrganization(role: MemberRole): boolean {
  return role === "admin";
}

/** Un editor ne crée un dossier que s'il est rattaché à au moins un établissement. */
export function canCreateAudit(role: MemberRole, establishmentsCount: number): boolean {
  return canWriteDossier(role) && establishmentsCount > 0;
}

/** Rôles qu'un admin peut attribuer à un utilisateur d'établissement. */
export const INVITABLE_ROLES = ["editor", "reader"] as const satisfies readonly MemberRole[];

export function isAccessBlocked(status: SubscriptionStatus): boolean {
  return status !== "active";
}

/** Motif affiché à un client qui n'a plus accès à ses dossiers. */
export function blockedReason(status: SubscriptionStatus): string {
  return status === "cancelled"
    ? "L’abonnement de votre organisme a été résilié."
    : "L’accès de votre organisme est suspendu, le plus souvent en attente d’un règlement.";
}

/** Message affiché en tête d'un dossier consulté sans droit d'écriture. */
export function readOnlyReason(role: MemberRole): string {
  return role === "admin"
    ? "vous consultez ce dossier en tant qu’admin. Le responsable pédagogique de l’établissement le remplit."
    : "votre accès à ce dossier est en lecture seule.";
}
