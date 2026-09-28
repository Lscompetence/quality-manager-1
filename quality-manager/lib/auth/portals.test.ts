import { describe, expect, it } from "vitest";
import { PORTALS, isPortal, passwordPagePath, portalOf, wrongPortalMessage } from "./portals";

describe("espaces de connexion", () => {
  it("donne à chaque rôle son propre espace", () => {
    expect(portalOf("platform")).toBe("platform");
    expect(portalOf("admin")).toBe("admin");
    expect(portalOf("editor")).toBe("member");
    expect(portalOf("reader")).toBe("member");
    expect(portalOf("client")).toBe("client");
    expect(portalOf("none")).toBeNull();
  });

  it("a une page de connexion distincte par espace", () => {
    const logins = Object.values(PORTALS).map((p) => p.login);
    expect(new Set(logins).size).toBe(logins.length);
  });

  it("ne cite jamais la page privée du super admin dans un message d'erreur", () => {
    for (const kind of ["platform", "admin", "editor", "reader", "client", "none"] as const) {
      expect(wrongPortalMessage(kind)).not.toContain("/platform");
      expect(wrongPortalMessage(kind).toLowerCase()).not.toContain("super admin");
    }
  });

  it("reconnaît les espaces valides seulement", () => {
    expect(isPortal("member")).toBe(true);
    expect(isPortal("superadmin")).toBe(false);
    expect(isPortal(undefined)).toBe(false);
  });

  it("ramène le lien d'un email dans le bon espace", () => {
    expect(passwordPagePath("member")).toBe("/reset-password?portal=member");
  });
});
