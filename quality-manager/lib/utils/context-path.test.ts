import { describe, expect, it } from "vitest";
import { indicatorCodeOf, indicatorContextPath, indicatorContextPaths } from "./context-path";

describe("context-path des indicateurs", () => {
  it("écrit toujours le format de référence", () => {
    expect(indicatorContextPath("I11")).toBe("indicator:I11");
  });

  it("filtre sur les deux écritures existantes", () => {
    expect(indicatorContextPaths("I2")).toEqual(["indicator:I2", "indicator.I2"]);
  });

  it("lit le code avec deux-points ou avec un point", () => {
    expect(indicatorCodeOf("indicator:I2")).toBe("I2");
    expect(indicatorCodeOf("indicator.I2")).toBe("I2");
    expect(indicatorCodeOf("indicator:I11")).toBe("I11");
  });

  it("ne confond pas un autre contexte avec un indicateur", () => {
    expect(indicatorCodeOf("dossier")).toBeNull();
    expect(indicatorCodeOf("miniapp:checklist-site")).toBeNull();
    expect(indicatorCodeOf(null)).toBeNull();
  });
});
