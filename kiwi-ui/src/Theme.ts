import { alpha, createTheme } from "@mui/material/styles";
import materialDesign2014 from "./theme/material-design-2014.json" with { type: "json" };

interface ChartPalette {
  series1: string;
  series2: string;
  series3: string;
  series4: string;
  series5: string;
}

declare module "@mui/material/styles" {
  interface Palette {
    chart: ChartPalette;
  }

  interface PaletteOptions {
    chart?: ChartPalette;
  }
}

const { blue, green, grey, orange, pink, purple, red } =
  materialDesign2014.palettes;

const theme = createTheme({
  palette: {
    mode: "light",
    contrastThreshold: 4.5,
    primary: {
      main: purple["800"],
      light: purple["500"],
      dark: purple["900"],
      contrastText: "#ffffff",
    },
    secondary: {
      main: grey["700"],
      light: grey["500"],
      dark: grey["900"],
      contrastText: "#ffffff",
    },
    success: {
      main: green["800"],
      light: green["600"],
      dark: green["900"],
      contrastText: "#ffffff",
    },
    warning: {
      main: orange["800"],
      light: orange["600"],
      dark: orange["900"],
      contrastText: grey["900"],
    },
    error: {
      main: red["700"],
      light: red["500"],
      dark: red["900"],
      contrastText: "#ffffff",
    },
    info: {
      main: blue["700"],
      light: blue["500"],
      dark: blue["900"],
      contrastText: "#ffffff",
    },
    chart: {
      series1: "#6A1B9A",
      series2: "#CF007E",
      series3: "#FF4E4C",
      series4: "#FFA600",
      series5: grey["500"],
    },
    text: {
      primary: grey["900"],
      secondary: grey["700"],
      disabled: grey["500"],
    },
    background: {
      default: grey["50"],
      paper: "#ffffff",
    },
    divider: grey["300"],
    action: {
      active: purple["700"],
      hover: "rgba(123, 31, 162, 0.04)",
      selected: "rgba(123, 31, 162, 0.08)",
      disabled: grey["500"],
      disabledBackground: grey["200"],
      focus: "rgba(123, 31, 162, 0.12)",
    },
  },
  typography: {
    fontFamily: "'Montserrat', sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "none",
          backgroundImage: "none",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiOutlinedInput: {
      defaultProps: {
        notched: false,
      },
      styleOverrides: {
        root: {
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
          "&.MuiInputBase-adornedStart:not(.MuiInputBase-multiline) .MuiOutlinedInput-input": {
            paddingLeft: 0,
          },
          "&.MuiInputBase-adornedEnd:not(.MuiInputBase-multiline) .MuiOutlinedInput-input": {
            paddingRight: 0,
          },
          "& .MuiSelect-select": {
            paddingRight: "36px",
          },
          "& .MuiOutlinedInput-notchedOutline": {
            top: 0,
          },
          "& .MuiOutlinedInput-notchedOutline legend": {
            display: "none",
          },
        },
      },
    },
    MuiInputLabel: {
      defaultProps: {
        disableAnimation: true,
      },
      styleOverrides: {
        root: {
          position: "static",
          transform: "none",
          maxWidth: "100%",
          fontSize: "0.875rem",
          marginBottom: 6,
          pointerEvents: "auto",
          transition: "none",
          "&.MuiInputLabel-shrink": {
            transform: "none",
            maxWidth: "100%",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 16,
          backgroundImage: "none",
          boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.14)}`,
        }),
      },
    },
  },
});

export default theme;
