import { describe, expect, it } from "vitest";
import {
  accountRequestSchema,
  clientRequestSchema,
  createClientAccountSchema,
  establishmentSchema,
  inviteMemberSchema,
  recordPaymentSchema,
} from "./access";

const uuid = "0a000000-0000-4000-8000-000000000000";

describe("establishmentSchema", () => {
  it("accepte un établissement minimal", () => {
    expect(establishmentSchema.safeParse({ name: "Site de Rabat" }).success).toBe(true);
  });
  it("refuse un SIRET mal formé", () => {
    expect(establishmentSchema.safeParse({ name: "Site", siret: "123" }).success).toBe(false);
    expect(establishmentSchema.safeParse({ name: "Site", siret: "12345678901234" }).success).toBe(
      true,
    );
  });
});

describe("inviteMemberSchema", () => {
  const base = {
    establishment_id: uuid,
    email: " Resp@OF.fr ",
    first_name: "Nadia",
    last_name: "B.",
  };
  it("n'accepte que editor et reader", () => {
    expect(inviteMemberSchema.safeParse({ ...base, role: "editor" }).success).toBe(true);
    expect(inviteMemberSchema.safeParse({ ...base, role: "reader" }).success).toBe(true);
    expect(inviteMemberSchema.safeParse({ ...base, role: "admin" }).success).toBe(false);
  });
  it("normalise l'email", () => {
    const r = inviteMemberSchema.parse({ ...base, role: "editor" });
    expect(r.email).toBe("resp@of.fr");
  });
});

describe("demandes", () => {
  it("un client ne peut pas créer une demande d'ouverture de compte", () => {
    expect(
      clientRequestSchema.safeParse({ kind: "ouverture_compte", subject: "abc", message: "hello" })
        .success,
    ).toBe(false);
  });
  it("le champ piège bloque les robots", () => {
    const ok = { organization_name: "OF", contact_name: "Ali B", contact_email: "a@b.fr" };
    expect(accountRequestSchema.safeParse(ok).success).toBe(true);
    expect(accountRequestSchema.safeParse({ ...ok, website: "spam" }).success).toBe(false);
  });
});

describe("pilotage plateforme", () => {
  it("création de compte client complète", () => {
    const r = createClientAccountSchema.safeParse({
      organization_name: "So Forma",
      admin_email: "direction@soforma.fr",
      admin_first_name: "Sam",
      admin_last_name: "F",
      plan: "pro",
      billing_cycle: "annual",
    });
    expect(r.success).toBe(true);
  });
  it("paiement : date ISO obligatoire", () => {
    expect(
      recordPaymentSchema.safeParse({ organization_id: uuid, paid_at: "25/09/2026" }).success,
    ).toBe(false);
    expect(
      recordPaymentSchema.safeParse({ organization_id: uuid, paid_at: "2026-09-25" }).success,
    ).toBe(true);
  });
});

describe("preuves par lien (revue de sécurité)", () => {
  it("refuse un lien javascript:", async () => {
    const { createAttachmentSchema } = await import("./attachments");
    const base = { audit_id: uuid, kind: "ref" as const, file_name: "x" };
    expect(
      createAttachmentSchema.safeParse({ ...base, external_url: "javascript:alert(1)" }).success,
    ).toBe(false);
    expect(
      createAttachmentSchema.safeParse({ ...base, external_url: "https://drive.google.com/x" })
        .success,
    ).toBe(true);
  });
});
