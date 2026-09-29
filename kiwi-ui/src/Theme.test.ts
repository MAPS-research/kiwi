import { describe, expect, it } from "vitest";
import theme from "./Theme.ts";
import materialDesign2014 from "./theme/material-design-2014.json" with { type: "json" };

describe("chart palette", () => {
  it("provides the shared five-color chart palette", () => {
    const { grey } = materialDesign2014.palettes;

    expect(theme.palette.chart).toEqual({
      series1: "#6A1B9A",
      series2: "#CF007E",
      series3: "#FF4E4C",
      series4: "#FFA600",
      series5: grey["500"],
    });
  });
});
