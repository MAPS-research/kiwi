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
      fontSize: "0.875rem",
    });
    expect(theme.components?.MuiOutlinedInput?.defaultProps?.notched).toBe(false);
    expect(theme.components?.MuiOutlinedInput?.styleOverrides?.root).toMatchObject({
      borderRadius: 8,
      minHeight: 44,
      alignItems: "center",
      "&:not(.MuiInputBase-multiline) .MuiOutlinedInput-input": {
        padding: "0 14px",
        fontSize: "0.875rem",
        height: "20px",
        lineHeight: "20px",
      },
      "&.MuiInputBase-sizeSmall": {
        minHeight: 38,
      },
      "&.MuiInputBase-sizeSmall:not(.MuiInputBase-multiline) .MuiOutlinedInput-input": {
        padding: "0 12px",
      },
      "&.MuiInputBase-multiline": {
        padding: "12px 14px",
      },
      "&.MuiInputBase-multiline .MuiOutlinedInput-input": {
        padding: 0,
        fontSize: "0.875rem",
        height: "auto",
        lineHeight: "20px",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        top: 0,
      },
      "& .MuiOutlinedInput-notchedOutline legend": {
        display: "none",
      },
    });
  });
});
