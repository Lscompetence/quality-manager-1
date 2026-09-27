import { describe, it, expect } from "vitest";
import { loginSchema, resetPasswordSchema, forgotPasswordSchema } from "./auth";

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

describe("resetPasswordSchema (activation d'un compte invité, mot de passe oublié)", () => {
  const ok = { password: "Abcdef12", confirmPassword: "Abcdef12" };

  it("rejects short password", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "Abc1", confirmPassword: "Abc1" }).success,
    ).toBe(false);
  });

  it("rejects password without uppercase", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "abcdef12", confirmPassword: "abcdef12" }).success,
    ).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    expect(resetPasswordSchema.safeParse({ ...ok, confirmPassword: "Abcdef13" }).success).toBe(
      false,
    );
  });

  it("accepts valid input", () => {
    expect(resetPasswordSchema.safeParse(ok).success).toBe(true);
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
