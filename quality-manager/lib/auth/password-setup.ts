// =============================================================================
// Choix d'un mot de passe après un lien reçu par email (oubli, invitation).
//
// Le lien pose une session pour SON compte, et /confirm dépose ce témoin avec
// l'identifiant de ce compte. /reset-password et l'action `resetPassword`
// exigent qu'il corresponde à la session : on ne peut donc jamais changer le
// mot de passe d'un autre compte resté connecté dans le navigateur (le lecteur
// connecté pendant que l'on réinitialise le compte du responsable, par exemple).
// =============================================================================

export const PASSWORD_SETUP_COOKIE = "qm_pw_setup";

/** 30 minutes pour choisir son mot de passe après avoir ouvert le lien. */
export const PASSWORD_SETUP_MAX_AGE = 30 * 60;

export function canSetPassword(cookieValue: string | undefined, userId: string): boolean {
  return Boolean(cookieValue) && cookieValue === userId;
}
