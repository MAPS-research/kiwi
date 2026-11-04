import theme from "./Theme.ts";

describe("global TextField theme", () => {
  it("preserves the original casing of tab labels", () => {
    expect(theme.components?.MuiTab?.styleOverrides?.root).toMatchObject({
      textTransform: "none",
    });
  });

  it("keeps input labels static and disables the outlined notch", () => {
    expect(theme.components?.MuiInputLabel?.defaultProps?.disableAnimation).toBe(true);
    expect(theme.components?.MuiInputLabel?.styleOverrides?.root).toMatchObject({
      position: "static",
      transform: "none",
      transition: "none",
      fontSize: "var(--type-label-size)",
      marginBottom: "var(--field-label-gap)",
    });
    expect(theme.components?.MuiOutlinedInput?.defaultProps?.notched).toBe(false);
    expect(theme.components?.MuiOutlinedInput?.styleOverrides?.root).toMatchObject({
      "& .MuiOutlinedInput-notchedOutline": { top: 0 },
      "& .MuiOutlinedInput-notchedOutline legend": { display: "none" },
    });
  });

  it("sizes fields from the density tokens, so one theme serves both densities", () => {
    expect(theme.components?.MuiOutlinedInput?.styleOverrides?.root).toMatchObject({
      borderRadius: "var(--field-radius)",
      minHeight: "var(--field-height)",
      alignItems: "center",
      "&:not(.MuiInputBase-multiline) .MuiOutlinedInput-input": {
        padding: "var(--field-padding-y) var(--field-padding-x)",
        height: "var(--type-control-leading)",
        lineHeight: "var(--type-control-leading)",
      },
      "&.MuiInputBase-multiline": {
        padding: "var(--field-padding-y) var(--field-padding-x)",
      },
    });
  });

  it("shows focus as one frame: the field's own edge at 2 px, error kept when focused", () => {
    expect(theme.components?.MuiOutlinedInput?.styleOverrides?.root).toMatchObject({
      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "var(--field-focus-border)",
        borderWidth: "var(--border-width-focus)",
      },
      "&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: "var(--status-error-text)",
        borderWidth: "var(--border-width-focus)",
      },
    });
  });
});
