import { describe, it, expect } from "vitest";
import { createAuditSchema } from "./audits";

describe("createAuditSchema", () => {
  it("requires at least one category", () => {
    const r = createAuditSchema.safeParse({
      establishment_id: "0a000000-0000-4000-8000-000000000000",
      name: "Audit 2026",
      audit_type: "initial",
      categories: [],
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid input", () => {
    const r = createAuditSchema.safeParse({
      establishment_id: "0a000000-0000-4000-8000-000000000000",
      name: "Audit 2026",
      audit_type: "initial",
      categories: ["AF", "CFA"],
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown audit_type", () => {
    const r = createAuditSchema.safeParse({
      establishment_id: "0a000000-0000-4000-8000-000000000000",
      name: "X",
      audit_type: "unknown",
      categories: ["AF"],
    });
    expect(r.success).toBe(false);
  });

  it("rejects too short name", () => {
    const r = createAuditSchema.safeParse({
      establishment_id: "0a000000-0000-4000-8000-000000000000",
      name: "X",
      audit_type: "initial",
      categories: ["AF"],
    });
    expect(r.success).toBe(false);
  });

  it("validates ISO date when provided", () => {
    const r = createAuditSchema.safeParse({
      establishment_id: "0a000000-0000-4000-8000-000000000000",
      name: "Audit 2026",
      audit_type: "initial",
      categories: ["AF"],
      audit_date: "not-a-date",
    });
    expect(r.success).toBe(false);
  });

  it("exige un établissement (sprint 8)", () => {
    const r = createAuditSchema.safeParse({
      name: "Audit 2026",
      audit_type: "initial",
      categories: ["AF"],
    });
    expect(r.success).toBe(false);
  });
});
