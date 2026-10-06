import { describe, expect, it } from "vitest";
import { canSetPassword } from "./password-setup";

describe("choix du mot de passe après un lien email", () => {
  it("autorisé pour le compte du lien", () => {
    expect(canSetPassword("u-editor", "u-editor")).toBe(true);
  });
  it("refusé pour un autre compte resté connecté", () => {
    expect(canSetPassword("u-editor", "u-reader")).toBe(false);
  });
  it("refusé sans lien ouvert", () => {
    expect(canSetPassword(undefined, "u-reader")).toBe(false);
    expect(canSetPassword("", "u-reader")).toBe(false);
  });
});
