import { describe, expect, it } from "vitest";
import {
  blockedReason,
  canCreateAudit,
  canManageOrganization,
  canWriteDossier,
  INVITABLE_ROLES,
  isAccessBlocked,
  isDossierReadOnly,
  readOnlyReason,
  type MemberRole,
} from "./permissions";

const ROLES: MemberRole[] = ["admin", "editor", "reader"];

describe("matrice des droits (Cadrage v3.1, § 3.5)", () => {
  it("seul l'editor écrit dans un dossier", () => {
    expect(ROLES.filter(canWriteDossier)).toEqual(["editor"]);
  });

  it("admin et reader sont en lecture seule sur les dossiers", () => {
    expect(ROLES.filter(isDossierReadOnly)).toEqual(["admin", "reader"]);
  });

  it("seul l'admin gère l'organisation", () => {
    expect(ROLES.filter(canManageOrganization)).toEqual(["admin"]);
  });

  it("un editor sans établissement ne crée pas de dossier", () => {
    expect(canCreateAudit("editor", 0)).toBe(false);
    expect(canCreateAudit("editor", 1)).toBe(true);
    expect(canCreateAudit("admin", 3)).toBe(false);
    expect(canCreateAudit("reader", 3)).toBe(false);
  });

  it("un admin n'invite que des editors et des readers", () => {
    expect([...INVITABLE_ROLES]).toEqual(["editor", "reader"]);
  });
});

describe("abonnement", () => {
  it("seul un compte actif garde l'accès", () => {
    expect(isAccessBlocked("active")).toBe(false);
    expect(isAccessBlocked("suspended")).toBe(true);
    expect(isAccessBlocked("cancelled")).toBe(true);
  });

  it("le motif distingue suspension et résiliation", () => {
    expect(blockedReason("suspended")).toMatch(/suspendu/);
    expect(blockedReason("cancelled")).toMatch(/résilié/);
  });
});

describe("lecture seule", () => {
  it("le message dépend du rôle", () => {
    expect(readOnlyReason("admin")).toMatch(/admin/);
    expect(readOnlyReason("reader")).toMatch(/lecture seule/);
  });
});
