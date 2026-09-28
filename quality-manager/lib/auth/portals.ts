// =============================================================================
// Espaces de connexion — chaque rôle a sa propre page, qui refuse les autres.
//
//   platform → super admin LS Compétences (page privée, jamais liée)
//   admin    → admin de l'organisme client
//   member   → editor (responsable pédagogique) et reader, par établissement
//   client   → accès à un dossier précis (rôle `client`)
// =============================================================================

export type Portal = "platform" | "admin" | "member" | "client";

export type PortalInfo = {
  /** Page de connexion */
  login: string;
  /** Page « mot de passe oublié » */
  forgot: string;
  /** Arrivée après connexion */
  home: string;
};

export const PORTALS: Record<Portal, PortalInfo> = {
  platform: { login: "/platform/login", forgot: "/platform/forgot-password", home: "/platform" },
  admin: { login: "/login", forgot: "/forgot-password", home: "/dashboard" },
  member: {
    login: "/etablissement/login",
    forgot: "/etablissement/forgot-password",
    home: "/dashboard",
  },
  client: { login: "/client/login", forgot: "/client/forgot-password", home: "/client" },
};

export function isPortal(value: unknown): value is Portal {
  return typeof value === "string" && value in PORTALS;
}

/** Rôle réel d'un compte : super admin, rôle de son profil, ou aucun accès. */
export type AccountKind = "platform" | "admin" | "editor" | "reader" | "client" | "none";

/** L'espace auquel appartient un compte (null : rattaché à rien). */
export function portalOf(kind: AccountKind): Portal | null {
  switch (kind) {
    case "platform":
      return "platform";
    case "admin":
      return "admin";
    case "editor":
    case "reader":
      return "member";
    case "client":
      return "client";
    case "none":
      return null;
  }
}

/**
 * Message affiché quand on se connecte depuis la mauvaise page. La page du
 * super admin n'est jamais citée : elle reste privée.
 */
export function wrongPortalMessage(kind: AccountKind): string {
  switch (portalOf(kind)) {
    case "admin":
      return "Ce compte est un compte admin : connectez-vous depuis la page de connexion admin.";
    case "member":
      return "Ce compte est un compte d’établissement : connectez-vous depuis l’espace établissement.";
    case "client":
      return "Ce compte est un compte client : connectez-vous depuis l’espace client.";
    default:
      return "Ce compte n’a pas accès à cet espace.";
  }
}

/** Lien d'un email (invitation, mot de passe oublié) : choix du mot de passe, puis l'espace. */
export function passwordPagePath(portal: Portal): string {
  return `/reset-password?portal=${portal}`;
}
