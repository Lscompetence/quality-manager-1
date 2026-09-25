import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema, forgotPasswordSchema } from "./auth";

describe("loginSchema", () => {
  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("accepts valid input", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "Anything" });
    expect(result.success).toBe(true);
  });
});

describe("signupSchema", () => {
  const base = {
    firstName: "Sofiane",
    lastName: "Saidi",
    organizationName: "LS Compétences",
    email: "sofiane@ls.fr",
    password: "Abcdef12",
    acceptTerms: true as const,
  };

  it("rejects short password", () => {
    const result = signupSchema.safeParse({ ...base, password: "Abc1" });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = signupSchema.safeParse({ ...base, password: "abcdef12" });
    expect(result.success).toBe(false);
  });

  it("rejects unaccepted terms", () => {
    const result = signupSchema.safeParse({ ...base, acceptTerms: false as unknown as true });
    expect(result.success).toBe(false);
  });

  it("accepts valid input", () => {
    const result = signupSchema.safeParse(base);
    expect(result.success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("rejects invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x" }).success).toBe(false);
  });
  it("accepts valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x@y.fr" }).success).toBe(true);
  });
});
