import { describe, expect, it } from "vitest";
import { buildMemberSearch, buildPlatformSearch } from "./items";

const establishments = [{ id: "e1", name: "Site de Rabat", city: "Rabat" }];
const audits = [
  {
    id: "a1",
    name: "Audit 2026",
    audit_type: "initial",
    categories: ["AF"],
    establishment_id: "e1",
  },
];
const hrefs = (groups: ReturnType<typeof buildMemberSearch>) =>
  groups.flatMap((g) => g.items.map((i) => i.href));

describe("recherche — espace membre", () => {
  it("l'admin trouve ses établissements et ses paramètres", () => {
    const h = hrefs(buildMemberSearch({ role: "admin", establishments, audits }));
    expect(h).toContain("/settings");
    expect(h).toContain("/etablissements/e1");
    expect(h).toContain("/audits/a1");
  });

  it("l'editor et le reader ne voient ni paramètres ni établissements", () => {
    for (const role of ["editor", "reader"] as const) {
      const h = hrefs(buildMemberSearch({ role, establishments, audits }));
      expect(h).not.toContain("/settings");
      expect(h.some((x) => x.startsWith("/etablissements"))).toBe(false);
      expect(h).toContain("/audits/a1");
    }
  });

  it("l'editor et le reader écrivent à leur admin, pas à LS Compétences", () => {
    for (const role of ["editor", "reader"] as const) {
      const pages = buildMemberSearch({ role, establishments, audits })[0]!.items;
      const contact = pages.find((i) => i.href === "/demandes");
      expect(contact?.label).toBe("Contacter mon admin");
    }
  });

  it("propose les indicateurs applicables du dossier le plus récent", () => {
    const groups = buildMemberSearch({ role: "editor", establishments, audits });
    const indicators = groups.find((g) => g.heading.startsWith("Indicateurs"));
    expect(indicators?.items.length).toBeGreaterThan(0);
    // Dossier AF seul : pas d'indicateur réservé au CFA (I13)
    expect(indicators?.items.some((i) => i.label.startsWith("I13 "))).toBe(false);
  });

  it("sans dossier, seulement les pages", () => {
    const groups = buildMemberSearch({ role: "reader", establishments: [], audits: [] });
    expect(groups.map((g) => g.heading)).toEqual(["Pages"]);
  });
});

describe("recherche — super admin", () => {
  it("ne mène à aucun dossier", () => {
    const groups = buildPlatformSearch({
      clients: [{ id: "o1", name: "ALAOUI", plan: "pro", subscription_status: "active" }],
      pendingRequests: [{ id: "r1", subject: "Bug export", who: "Yassine" }],
    });
    const h = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(h).toContain("/platform/clients/o1");
    expect(h.some((x) => x.startsWith("/audits"))).toBe(false);
  });
});
