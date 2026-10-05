import { describe, expect, it } from "vitest";
import { parsePlanRequest, requestCategory } from "./categories";

describe("catégories de demandes", () => {
  it("reconnaît une demande de changement de plan", () => {
    expect(
      requestCategory({ kind: "support", subject: "Changement d’abonnement : Pro (mensuel)" }),
    ).toBe("abonnement");
  });

  it("garde le type stocké pour les autres demandes", () => {
    expect(requestCategory({ kind: "reclamation", subject: "Bug à l’export" })).toBe("reclamation");
    expect(requestCategory({ kind: "support", subject: "Comment ajouter un lien ?" })).toBe(
      "support",
    );
  });
});

describe("plan demandé", () => {
  it("lit le plan et la facturation", () => {
    expect(parsePlanRequest("Changement d’abonnement : Pro (mensuel)")).toEqual({
      plan: "pro",
      cycle: "monthly",
    });
    expect(parsePlanRequest("Changement d’abonnement : Essentiel (annuel)")).toEqual({
      plan: "essentiel",
      cycle: "annual",
    });
    expect(parsePlanRequest("Changement d’abonnement : Réseau (annuel)")).toEqual({
      plan: "reseau",
      cycle: "annual",
    });
  });

  it("refuse un objet qui ne suit pas le format", () => {
    expect(parsePlanRequest("Changement d’abonnement : Premium (annuel)")).toBeNull();
    expect(parsePlanRequest("Question sur l’abonnement")).toBeNull();
    expect(parsePlanRequest("Changement d’abonnement : Pro")).toBeNull();
  });
});
