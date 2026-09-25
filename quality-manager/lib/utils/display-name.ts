/**
 * Nom affiché d'un utilisateur : « Prénom Nom », ou l'email quand le profil
 * n'est pas encore renseigné — jamais une chaîne vide.
 */
export function displayName(firstName: string | null | undefined, lastName: string | null | undefined, email: string): string {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || email;
}

/** Deux initiales : celles du prénom et du nom, ou les deux premières lettres de l'email. */
export function initialsOf(name: string): string {
  if (name.includes("@")) {
    const local = name.split("@")[0]?.replace(/[^a-zA-Z]/g, "") ?? "";
    return (local.slice(0, 2) || "?").toUpperCase();
  }
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
  return (letters || "?").toUpperCase();
}
