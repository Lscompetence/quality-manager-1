import { describe, it, expect } from "vitest";
import { updateOrgSchema, updatePlanSchema } from "./organization";

describe("updateOrgSchema", () => {
  it("requires name", () => {
    expect(updateOrgSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts minimal valid input", () => {
    const r = updateOrgSchema.safeParse({ name: "LS Compétences" });
    expect(r.success).toBe(true);
  });

  it("accepts empty optional fields", () => {
    const r = updateOrgSchema.safeParse({
      name: "LS Compétences",
      siret: "",
      email: "",
      website: "",
    });
    expect(r.success).toBe(true);
  });

  it("validates email when provided", () => {
    const r = updateOrgSchema.safeParse({ name: "X", email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("validates website URL", () => {
    const r = updateOrgSchema.safeParse({ name: "X", website: "not-a-url" });
    expect(r.success).toBe(false);
  });
});

describe("updatePlanSchema", () => {
  it("accepts valid plan + cycle", () => {
    expect(updatePlanSchema.safeParse({ plan: "pro", billing_cycle: "annual" }).success).toBe(true);
  });

  it("rejects invalid plan", () => {
    expect(updatePlanSchema.safeParse({ plan: "ultra", billing_cycle: "annual" }).success).toBe(false);
  });

  it("rejects invalid billing cycle", () => {
    expect(updatePlanSchema.safeParse({ plan: "pro", billing_cycle: "weekly" }).success).toBe(false);
  });
});
