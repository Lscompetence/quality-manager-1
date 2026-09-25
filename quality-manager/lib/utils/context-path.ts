/**
 * Rattachement d'une pièce jointe à un indicateur via `context_path`.
 *
 * Le format de référence est « indicator:I11 ». Des documents ont aussi été
 * déposés depuis l'espace client avec « indicator.I11 » : on accepte les deux
 * à la lecture, et on écrit toujours le format de référence.
 */
export function indicatorContextPath(code: string): string {
  return `indicator:${code}`;
}

/** Les deux écritures possibles, pour filtrer une requête. */
export function indicatorContextPaths(code: string): string[] {
  return [`indicator:${code}`, `indicator.${code}`];
}

/** Code de l'indicateur (« I11 ») d'un context_path, ou null s'il n'en désigne pas. */
export function indicatorCodeOf(contextPath: string | null | undefined): string | null {
  const match = contextPath?.match(/^indicator[:.](I\d+)$/i);
  return match?.[1] ? match[1].toUpperCase() : null;
}
