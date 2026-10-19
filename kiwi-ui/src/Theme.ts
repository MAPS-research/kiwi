import { createElement, type CSSProperties } from "react";
import { createTheme, type PaletteOptions, type Theme } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import HighlightOffOutlined from "@mui/icons-material/HighlightOffOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import generated from "./theme/generated/mui-theme.json" with { type: "json" };
import { darkModeEnabled } from "./config/branding.ts";
import {
  CheckboxCheckedIcon,
  CheckboxIcon,
  CheckboxIndeterminateIcon,
  CONTROL_BOX_CLASS,
  RadioCheckedIcon,
  RadioIcon,
} from "./theme/controlIcons.tsx";

/**
 * The MUI theme of the Stage 1 design (kiwi-ui/DESIGN.md, Design system >
 * Generation spec > The MUI theme).
 *
 * - The palettes, type scale and radius come from the generated preview
 *   (src/theme/generated/mui-theme.json), never typed here.
 * - MUI switches colour schemes on the same `data-theme` attribute as the token
 *   CSS (src/theme/generated/kiwi-ui.tokens.css), so one attribute re-themes both.
 * - Component overrides read the token custom properties (var(--button-height),
 *   var(--space-inset-x), ...), so `data-density` and the coarse-pointer media query
 *   re-resolve them with no second theme.
 * - Focus is one frame: a control with a border recolours that border to the
 *   2 px --focus-ring (the extra pixel drawn inward); a control without one keeps
 *   the global 2 px ring from src/theme/base.css.
 */

interface ChartPalette {
  series1: string;
  series2: string;
  series3: string;
  series4: string;
  series5: string;
  other: string;
  grid: string;
  baseline: string;
  tickText: string;
  plot: string;
}

declare module "@mui/material/styles" {
  interface Palette {
    chart: ChartPalette;
  }

  interface PaletteOptions {
    chart?: ChartPalette;
  }

  interface TypographyVariants {
    display: CSSProperties;
  }

  interface TypographyVariantsOptions {
    display?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    display: true;
  }
}

/** Drops the generator's notes (`_note`, `_kiwi`, `_dot`, ...), which MUI would turn into CSS variables. */
function withoutNotes<T>(value: T): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !key.startsWith("_"))
      .map(([key, entry]) => [key, withoutNotes(entry)])
  ) as T;
}

const palette = (scheme: "light" | "dark") =>
  withoutNotes(generated.colorSchemes[scheme].palette) as unknown as PaletteOptions;

/** A composite type role (`--type-<role>-*`) as style properties. */
const type = (role: string) => ({
  fontFamily: `var(--type-${role}-family)`,
  fontSize: `var(--type-${role}-size)`,
  lineHeight: `var(--type-${role}-leading)`,
  fontWeight: `var(--type-${role}-weight)`,
});

/**
 * Focus on a bordered control: the border itself becomes the 2 px frame, the
 * second pixel drawn inward so nothing shifts, and no ring outside it.
 */
const frame = (color: string) => ({
  outline: "none",
  borderColor: color,
  boxShadow: `inset 0 0 0 1px ${color}`,
});

/** A hit area of at least `token` around a control, without changing its drawn size. */
const hitArea = (token: string) => ({
  "&::before": {
    content: '""',
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `max(100%, var(${token}))`,
    height: `max(100%, var(${token}))`,
    transform: "translate(-50%, -50%)",
  },
});

/**
 * A pressed or current marker: a flat bar along one edge of a rounded control,
 * inset from its corners. Drawn as an inset box-shadow it bent up the corners and
 * read as a drop shadow under a raised key.
 */
const markerBar = (edge: "bottom" | "left", color: string, thickness: string, radius: string) => ({
  boxShadow: "none",
  backgroundImage: `linear-gradient(${color}, ${color})`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: edge === "bottom" ? "center bottom" : "left center",
  backgroundSize: edge === "bottom" ? `calc(100% - 2 * ${radius}) ${thickness}` : `${thickness} calc(100% - 2 * ${radius})`,
});

const DISABLED = "&.Mui-disabled, &[aria-disabled='true'], &[aria-disabled='true']:hover";
const FOCUS = "&.Mui-focusVisible, &:focus-visible";
const PRESS = {
  transition: "transform var(--motion-micro) var(--motion-ease-toggle)",
  "&:active": { transform: "scale(var(--motion-press-scale))" },
  "&[aria-disabled='true']:active": { transform: "none" },
};

/** The four button roles of `§ Buttons`: the state order puts focus after disabled, so a focused aria-disabled button still shows its frame. */
const buttonRole = (role: "primary" | "secondary" | "destructive") => ({
  backgroundColor: `var(--button-${role}-fill)`,
  color: `var(--button-${role}-text)`,
  border: `1px solid var(--button-${role}-border)`,
  "&:hover": {
    backgroundColor: `var(--button-${role}-hover-fill)`,
    borderColor: `var(--button-${role}-hover-border)`,
  },
  "&:active": {
    backgroundColor: `var(--button-${role}-active-fill)`,
    borderColor: `var(--button-${role}-active-border)`,
  },
  [DISABLED]: {
    backgroundColor: `var(--button-${role}-disabled-fill)`,
    color: `var(--button-${role}-disabled-text)`,
    borderColor: `var(--button-${role}-disabled-border)`,
  },
  [FOCUS]: frame(`var(--button-${role}-focus-border)`),
});

const TERTIARY = {
  backgroundColor: "var(--button-tertiary-fill)",
  color: "var(--button-tertiary-text)",
  "&:hover": { backgroundColor: "var(--button-tertiary-hover-fill)" },
  "&:active": { backgroundColor: "var(--button-tertiary-active-fill)" },
  [DISABLED]: {
    backgroundColor: "var(--button-tertiary-disabled-fill)",
    color: "var(--button-tertiary-disabled-text)",
    fontWeight: "var(--button-tertiary-disabled-weight)",
  },
  "&[aria-pressed='true']": {
    backgroundColor: "var(--button-tertiary-variant-pressed-fill)",
    color: "var(--button-tertiary-variant-pressed-text)",
    ...markerBar("bottom", "var(--button-tertiary-variant-pressed-marker)", "var(--button-marker)", "var(--button-radius)"),
  },
};

/** One frame on a status, filter or role chip; MUI's filled colours never reach the screen. */
const statusChip = (kind: "success" | "warning" | "error" | "info") => ({
  fontWeight: "var(--weight-semibold)",
  backgroundColor: `var(--chip-status-variant-${kind}-fill)`,
  color: `var(--chip-status-variant-${kind}-text)`,
  border: "none",
  "& .MuiChip-icon": { color: `var(--chip-status-variant-${kind}-icon)` },
});

/** Elevation keeps two depths: menus and tooltips cast --shadow-1, floating sheets --shadow-2. */
const shadows = [
  "none",
  ...Array.from({ length: 24 }, (_, index) => (index < 4 ? "var(--shadow-1)" : "var(--shadow-2)")),
] as Theme["shadows"];

/** Box styles for the checkbox and radio drawings; kept beside the theme so both change together. */
export const controlBoxStyles = {
  [`.${CONTROL_BOX_CLASS}`]: {
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "var(--checkbox-size)",
    height: "var(--checkbox-size)",
    border: "var(--checkbox-border-width) solid var(--checkbox-border)",
    borderRadius: "var(--checkbox-radius)",
    backgroundColor: "var(--checkbox-fill)",
    color: "var(--checkbox-variant-checked-glyph)",
  },
  [`.${CONTROL_BOX_CLASS}--radio`]: { borderRadius: "50%" },
  [`.${CONTROL_BOX_CLASS}--check, .${CONTROL_BOX_CLASS}--dash`]: {
    backgroundColor: "var(--checkbox-variant-checked-fill)",
    borderColor: "var(--checkbox-variant-checked-border)",
  },
  [`.${CONTROL_BOX_CLASS}--dot`]: {
    backgroundColor: "var(--checkbox-variant-radio-checked-fill)",
    borderColor: "var(--checkbox-variant-radio-checked-border)",
  },
  [`.${CONTROL_BOX_CLASS}__dot`]: {
    width: "var(--checkbox-dot)",
    height: "var(--checkbox-dot)",
    borderRadius: "50%",
    backgroundColor: "var(--checkbox-variant-radio-checked-glyph)",
  },
  [`.MuiCheckbox-root:hover .${CONTROL_BOX_CLASS}, .MuiRadio-root:hover .${CONTROL_BOX_CLASS}`]: {
    borderColor: "var(--checkbox-hover-border)",
  },
  [`.MuiCheckbox-root:active .${CONTROL_BOX_CLASS}, .MuiRadio-root:active .${CONTROL_BOX_CLASS}`]: {
    backgroundColor: "var(--checkbox-active-fill)",
  },
  [`.MuiCheckbox-root.Mui-focusVisible .${CONTROL_BOX_CLASS}, .MuiRadio-root.Mui-focusVisible .${CONTROL_BOX_CLASS}`]:
    frame("var(--checkbox-focus-border)"),
  [`.MuiCheckbox-root.Mui-disabled .${CONTROL_BOX_CLASS}, .MuiRadio-root.Mui-disabled .${CONTROL_BOX_CLASS}`]: {
    backgroundColor: "var(--checkbox-disabled-fill)",
    borderColor: "var(--checkbox-disabled-border)",
    color: "var(--checkbox-disabled-glyph)",
  },
  [`.MuiCheckbox-root:has(input[aria-invalid='true']) .${CONTROL_BOX_CLASS}`]: {
    borderColor: "var(--status-error-text)",
  },
  // A focused checkbox inside a row or a menu keeps the box as its frame.
  ".MuiCheckbox-root input:focus-visible, .MuiRadio-root input:focus-visible, .MuiSwitch-input:focus-visible": {
    outline: "none",
  },
};

const { _note: _typographyNote, ...typography } = generated.typography;

export function createKiwiTheme({ dark = darkModeEnabled() }: { dark?: boolean } = {}): Theme {
  return createTheme({
    cssVariables: { colorSchemeSelector: "data-theme", cssVarPrefix: "mui" },
    colorSchemes: dark
      ? { light: { palette: palette("light") }, dark: { palette: palette("dark") } }
      : { light: { palette: palette("light") } },
    shape: { borderRadius: generated.shape.borderRadius },
    shadows,
    // WHY: MUI's ButtonBase resets `outline: 0` in a rule that loads after base.css,
    // so without this an icon, text or tab button showed no focus at all. This is the
    // one 2 px ring of a borderless control; MUI insets it on clip-prone rows (tabs,
    // menu items, list buttons) and skips checkboxes, radios and switches, which frame
    // their own box. A bordered control's `frame()` comes later and turns it off.
    // boxShadow stays unset so a pressed marker or the launcher's shadow survives focus.
    focusVisible: {
      outlineStyle: "solid",
      outlineColor: "var(--focus-ring)",
      outlineWidth: "var(--border-width-focus)",
      outlineOffset: "var(--size-focus-offset)",
      boxShadow: undefined,
    },
    typography: {
      ...typography,
      fontWeightLight: 400,
      fontWeightRegular: 400,
      fontWeightMedium: 600,
      fontWeightBold: 600,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // The global rules live in src/theme/base.css; MUI's own reset sets the canvas and ink.
          body: { backgroundColor: "var(--background)", color: "var(--text)" },
          ...controlBoxStyles,
        },
      },

      // Ripples are motion outside the budget (`§ Motion`): colour switches instantly instead.
      MuiButtonBase: { defaultProps: { disableRipple: true, disableTouchRipple: true } },

      // Only opacity and transform animate (`§ Motion`): a Collapse, and every Accordion
      // built on it, opens and closes at once instead of animating its height.
      MuiCollapse: { defaultProps: { timeout: 0 } },

      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            ...type("button"),
            position: "relative",
            minHeight: "var(--button-height)",
            minWidth: "var(--button-min-width)",
            padding: "0 var(--button-padding-x)",
            borderRadius: "var(--button-radius)",
            textTransform: "none",
            whiteSpace: "nowrap",
            boxShadow: "none",
            ...PRESS,
            ...hitArea("--button-hit"),
            "&:hover": { boxShadow: "none" },
            "& .MuiButton-startIcon": { marginLeft: 0, marginRight: "var(--button-gap)" },
            "& .MuiButton-endIcon": { marginRight: 0, marginLeft: "var(--button-gap)" },
            "& .MuiButton-startIcon > *:nth-of-type(1), & .MuiButton-endIcon > *:nth-of-type(1)": {
              fontSize: "var(--button-icon-size)",
            },
            variants: [
              { props: { variant: "contained" }, style: buttonRole("primary") },
              { props: { variant: "outlined" }, style: buttonRole("secondary") },
              { props: { variant: "text" }, style: TERTIARY },
              // Destructive actions are outlined in the destructive colour; a filled red button is not used.
              { props: { variant: "contained", color: "error" }, style: buttonRole("destructive") },
              { props: { variant: "outlined", color: "error" }, style: buttonRole("destructive") },
              { props: { variant: "text", color: "error" }, style: { color: "var(--destructive-text)" } },
            ],
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: {
            position: "relative",
            minWidth: "var(--icon-button-size)",
            minHeight: "var(--icon-button-size)",
            padding: 0,
            borderRadius: "var(--icon-button-radius)",
            color: "var(--icon-button-icon)",
            ...PRESS,
            ...hitArea("--icon-button-hit"),
            "& .MuiSvgIcon-root": { fontSize: "var(--icon-button-icon-size)" },
            "&:hover": {
              backgroundColor: "var(--icon-button-hover-fill)",
              color: "var(--icon-button-hover-icon)",
            },
            "&:active": {
              backgroundColor: "var(--icon-button-active-fill)",
              color: "var(--icon-button-active-icon)",
            },
            [DISABLED]: {
              backgroundColor: "var(--icon-button-disabled-fill)",
              color: "var(--icon-button-disabled-icon)",
            },
            "&[aria-pressed='true']": {
              backgroundColor: "var(--icon-button-variant-selected-fill)",
              color: "var(--icon-button-variant-selected-icon)",
              ...markerBar(
                "bottom",
                "var(--icon-button-variant-selected-marker)",
                "var(--icon-button-marker)",
                "var(--icon-button-radius)"
              ),
            },
            variants: [
              { props: { color: "primary" }, style: { color: "var(--icon-accent)" } },
              { props: { color: "error" }, style: { color: "var(--destructive-text)" } },
              { props: { color: "inherit" }, style: { color: "inherit" } },
            ],
          },
        },
      },

      MuiInputBase: {
        styleOverrides: {
          root: {
            ...type("control"),
            color: "var(--field-text)",
          },
          input: {
            "&::placeholder": { color: "var(--field-placeholder)", opacity: 1 },
          },
        },
      },

      MuiOutlinedInput: {
        defaultProps: { notched: false },
        styleOverrides: {
          root: {
            borderRadius: "var(--field-radius)",
            minHeight: "var(--field-height)",
            alignItems: "center",
            backgroundColor: "var(--field-fill)",
            "&:not(.MuiInputBase-multiline) .MuiOutlinedInput-input": {
              padding: "var(--field-padding-y) var(--field-padding-x)",
              height: "var(--type-control-leading)",
              lineHeight: "var(--type-control-leading)",
            },
            "&.MuiInputBase-multiline": {
              padding: "var(--field-padding-y) var(--field-padding-x)",
            },
            "&.MuiInputBase-multiline .MuiOutlinedInput-input": {
              padding: 0,
              lineHeight: "var(--type-control-leading)",
            },
            "&.MuiInputBase-adornedStart": { paddingLeft: "var(--field-padding-x)" },
            "&.MuiInputBase-adornedEnd": { paddingRight: "var(--space-2)" },
            "&.MuiInputBase-adornedStart:not(.MuiInputBase-multiline) .MuiOutlinedInput-input": {
              paddingLeft: "var(--space-2)",
            },
            "&.MuiInputBase-adornedEnd:not(.MuiInputBase-multiline) .MuiOutlinedInput-input": {
              paddingRight: 0,
            },
            "& .MuiSelect-select": { paddingRight: "var(--field-select-padding-right)" },
            "& .MuiOutlinedInput-notchedOutline": {
              top: 0,
              borderColor: "var(--field-border)",
              borderRadius: "var(--field-radius)",
            },
            "& .MuiOutlinedInput-notchedOutline legend": { display: "none" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--field-hover-border)" },
            // One frame: the outline MUI draws inside the box becomes 2 px of --focus-ring.
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--field-focus-border)",
              borderWidth: "var(--border-width-focus)",
            },
            "&.Mui-error .MuiOutlinedInput-notchedOutline, &.Mui-error:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--status-error-text)",
            },
            "&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--status-error-text)",
              borderWidth: "var(--border-width-focus)",
            },
            "&.MuiInputBase-readOnly": { backgroundColor: "var(--field-variant-read-only-fill)" },
            "&.MuiInputBase-readOnly .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--field-variant-read-only-border)",
            },
            "&.Mui-disabled": { backgroundColor: "var(--field-disabled-fill)" },
            "&.Mui-disabled .MuiOutlinedInput-notchedOutline": {
              borderColor: "var(--field-disabled-border)",
            },
            "&.Mui-disabled .MuiOutlinedInput-input": {
              color: "var(--field-disabled-text)",
              WebkitTextFillColor: "var(--field-disabled-text)",
            },
          },
        },
      },

      MuiInput: {
        styleOverrides: {
          underline: {
            "&::before": { borderBottomColor: "var(--field-border)" },
            "&:hover:not(.Mui-disabled, .Mui-error)::before": { borderBottomColor: "var(--field-hover-border)" },
            "&::after": { borderBottomColor: "var(--field-focus-border)", transition: "none" },
            "&.Mui-error::after": { borderBottomColor: "var(--status-error-text)" },
          },
        },
      },

      MuiInputLabel: {
        defaultProps: { disableAnimation: true },
        styleOverrides: {
          root: {
            ...type("label"),
            position: "static",
            transform: "none",
            maxWidth: "100%",
            marginBottom: "var(--field-label-gap)",
            color: "var(--field-label)",
            pointerEvents: "auto",
            transition: "none",
            "&.MuiInputLabel-shrink": { transform: "none", maxWidth: "100%" },
            "&.Mui-focused, &.Mui-error": { color: "var(--field-label)" },
            "&.Mui-disabled": { color: "var(--disabled-text)" },
          },
        },
      },

      MuiFormLabel: {
        styleOverrides: {
          root: {
            ...type("label"),
            color: "var(--field-label)",
            "&.Mui-focused, &.Mui-error": { color: "var(--field-label)" },
            "&.Mui-disabled": { color: "var(--disabled-text)" },
          },
        },
      },

      MuiFormHelperText: {
        styleOverrides: {
          root: {
            ...type("caption"),
            margin: "var(--field-helper-gap) 0 0",
            color: "var(--field-helper)",
            "&.Mui-error": { color: "var(--status-error-text)" },
            "&.Mui-disabled": { color: "var(--disabled-text)" },
          },
        },
      },

      MuiSelect: {
        styleOverrides: {
          icon: { color: "var(--icon-default)" },
        },
      },

      MuiCheckbox: {
        defaultProps: {
          icon: createElement(CheckboxIcon),
          checkedIcon: createElement(CheckboxCheckedIcon),
          indeterminateIcon: createElement(CheckboxIndeterminateIcon),
        },
        styleOverrides: {
          root: {
            position: "relative",
            padding: 0,
            ...hitArea("--checkbox-hit"),
            // The box's own frame is the focus (controlBoxStyles); MUI's ring on the glyph would be a second one.
            "&.Mui-focusVisible svg:first-of-type": { outline: "none" },
          },
        },
      },

      MuiRadio: {
        defaultProps: {
          icon: createElement(RadioIcon),
          checkedIcon: createElement(RadioCheckedIcon),
        },
        styleOverrides: {
          root: {
            position: "relative",
            padding: 0,
            ...hitArea("--checkbox-hit"),
            "&.Mui-focusVisible svg:first-of-type": { outline: "none" },
          },
        },
      },

      MuiFormControlLabel: {
        styleOverrides: {
          root: {
            marginLeft: 0,
            columnGap: "var(--checkbox-label-gap)",
            // A checkbox or radio label is the label role at 400 (DESIGN.md, Checkboxes and radios);
            // a switch's is the label role at its own weight, 600 (the preview's .switch-row).
            "& .MuiFormControlLabel-label": {
              ...type("label"),
              fontWeight: "var(--type-weight-regular)",
              color: "var(--checkbox-label)",
            },
            "&:has(.MuiSwitch-root) .MuiFormControlLabel-label": { fontWeight: "var(--type-label-weight)" },
            "& .MuiFormControlLabel-label.Mui-disabled": { color: "var(--checkbox-disabled-label)" },
          },
        },
      },

      MuiSwitch: {
        styleOverrides: {
          root: {
            position: "relative",
            width: "var(--switch-track-width)",
            height: "var(--switch-track-height)",
            padding: 0,
            overflow: "visible",
            ...hitArea("--switch-hit"),
            // The design has one switch: `size="small"` takes the same 14 px thumb and 3 px inset.
            // MUI's small variant styles them through the root, so this matches its specificity.
            "&.MuiSwitch-sizeSmall .MuiSwitch-switchBase": {
              padding: "calc((var(--switch-track-height) - var(--switch-thumb-size)) / 2)",
            },
            "&.MuiSwitch-sizeSmall .MuiSwitch-thumb": {
              width: "var(--switch-thumb-size)",
              height: "var(--switch-thumb-size)",
            },
          },
          switchBase: {
            padding: "calc((var(--switch-track-height) - var(--switch-thumb-size)) / 2)",
            color: "var(--switch-thumb)",
            transitionDuration: "var(--motion-micro)",
            transitionTimingFunction: "var(--motion-ease-toggle)",
            "&:hover": { backgroundColor: "transparent" },
            "&.Mui-checked": {
              transform: "translateX(calc(var(--switch-track-width) - var(--switch-track-height)))",
              color: "var(--switch-variant-on-thumb)",
            },
            "&.Mui-checked + .MuiSwitch-track": {
              backgroundColor: "var(--switch-variant-on-track)",
              borderColor: "var(--switch-variant-on-border)",
              opacity: 1,
            },
            "&.Mui-focusVisible + .MuiSwitch-track": frame("var(--switch-focus-border)"),
            "&.Mui-disabled": { color: "var(--switch-disabled-thumb)" },
            "&.Mui-disabled + .MuiSwitch-track": {
              backgroundColor: "var(--switch-disabled-track)",
              borderColor: "var(--switch-disabled-border)",
              opacity: 1,
            },
          },
          thumb: {
            width: "var(--switch-thumb-size)",
            height: "var(--switch-thumb-size)",
            borderRadius: "var(--switch-thumb-radius)",
            boxShadow: "none",
          },
          track: {
            boxSizing: "border-box",
            borderRadius: "var(--switch-radius)",
            backgroundColor: "var(--switch-track)",
            border: "1px solid var(--switch-border)",
            opacity: 1,
          },
        },
      },

      MuiChip: {
        styleOverrides: {
          root: {
            // The preview's .chip: the caption role, regular; status chips add 600.
            ...type("caption"),
            height: "var(--chip-height)",
            borderRadius: "var(--chip-radius)",
            backgroundColor: "var(--chip-role-fill)",
            color: "var(--chip-role-text)",
            border: "none",
            "& .MuiChip-label": { padding: "0 var(--chip-padding-x)" },
            "& .MuiChip-icon": {
              fontSize: "var(--chip-icon-size)",
              marginLeft: "var(--chip-padding-x)",
              marginRight: "calc(-1 * var(--chip-gap) / 2)",
              color: "inherit",
            },
            "& .MuiChip-deleteIcon": { color: "var(--icon-default)", "&:hover": { color: "var(--icon-hover)" } },
            "&.MuiChip-clickable:hover": { backgroundColor: "var(--chip-role-hover-fill)" },
            [FOCUS]: frame("var(--focus-ring)"),
            variants: [
              {
                // An outlined chip is a filter chip: the sheet, the field edge and the ink.
                props: { variant: "outlined" },
                style: {
                  backgroundColor: "var(--chip-filter-fill)",
                  color: "var(--chip-filter-text)",
                  border: "1px solid var(--chip-filter-border)",
                  fontWeight: "var(--type-weight-regular)",
                  "&.MuiChip-clickable:hover": { backgroundColor: "var(--chip-filter-hover-fill)" },
                  "&.MuiChip-clickable:active": { backgroundColor: "var(--chip-filter-active-fill)" },
                  [FOCUS]: frame("var(--chip-filter-focus-border)"),
                },
              },
              {
                // Primary marks the selected filter: the selection tint, accent edge and 600.
                props: { color: "primary" },
                style: {
                  backgroundColor: "var(--chip-filter-variant-selected-fill)",
                  color: "var(--chip-filter-variant-selected-text)",
                  border: "1px solid var(--chip-filter-variant-selected-border)",
                  fontWeight: "var(--chip-filter-variant-selected-weight)",
                  "&.MuiChip-clickable:hover": { backgroundColor: "var(--chip-filter-variant-selected-fill)" },
                },
              },
              { props: { color: "success" }, style: statusChip("success") },
              { props: { color: "warning" }, style: statusChip("warning") },
              { props: { color: "error" }, style: statusChip("error") },
              { props: { color: "info" }, style: statusChip("info") },
              { props: { color: "secondary" }, style: { backgroundColor: "var(--chip-role-fill)", color: "var(--chip-role-text)", border: "none" } },
              {
                props: { size: "small" },
                style: { height: "calc(var(--chip-height) - var(--space-1))" },
              },
            ],
          },
        },
      },

      // A toggle button is bordered: focus recolours its own edge, never a ring outside it.
      MuiToggleButton: {
        styleOverrides: { root: { [FOCUS]: frame("var(--focus-ring)") } },
      },

      MuiTabs: {
        styleOverrides: {
          root: { minHeight: "var(--tabs-height)" },
          list: { gap: "var(--tabs-gap)" },
          indicator: {
            height: "var(--tabs-marker)",
            backgroundColor: "var(--tabs-variant-selected-marker)",
            transition: "none",
          },
        },
      },

      MuiTab: {
        styleOverrides: {
          root: {
            ...type("label"),
            minHeight: "var(--tabs-height)",
            padding: "0 var(--tabs-padding-x)",
            textTransform: "none",
            whiteSpace: "nowrap",
            color: "var(--tabs-text)",
            "&:hover": { backgroundColor: "var(--tabs-hover-fill)", color: "var(--tabs-hover-text)" },
            "&:active": { backgroundColor: "var(--tabs-active-fill)", color: "var(--tabs-active-text)" },
            "&.Mui-selected": { color: "var(--tabs-variant-selected-text)" },
            "&.Mui-disabled, &[aria-disabled='true']": {
              color: "var(--tabs-disabled-text)",
              fontWeight: "var(--tabs-disabled-weight)",
            },
            // Inside a tab bar the ring is inset, so the bar never clips it.
            "&:focus-visible, &.Mui-focusVisible": { outlineOffset: "calc(-1 * var(--size-focus-ring))" },
          },
        },
      },

      MuiListItemButton: {
        styleOverrides: {
          root: {
            minHeight: "var(--sidebar-item-height)",
            borderRadius: "var(--sidebar-item-radius)",
            color: "var(--sidebar-item-text)",
            "& .MuiListItemIcon-root": { color: "var(--sidebar-item-icon)" },
            "&:hover": { backgroundColor: "var(--sidebar-item-hover-fill)", color: "var(--sidebar-item-hover-text)" },
            "&:active": { backgroundColor: "var(--sidebar-item-active-fill)" },
            "&.Mui-selected, &[aria-current='page']": {
              backgroundColor: "var(--sidebar-item-variant-current-fill)",
              color: "var(--sidebar-item-variant-current-text)",
              ...markerBar("left", "var(--sidebar-item-variant-current-marker)", "var(--size-marker)", "var(--sidebar-item-radius)"),
              "& .MuiListItemIcon-root": { color: "var(--sidebar-item-variant-current-icon)" },
            },
            "&.Mui-selected:hover": { backgroundColor: "var(--sidebar-item-variant-current-fill)" },
            "&.Mui-focusVisible": { backgroundColor: "transparent" },
            "&:focus-visible, &.Mui-focusVisible": { outlineOffset: "calc(-1 * var(--size-focus-ring))" },
          },
        },
      },

      MuiMenu: {
        styleOverrides: {
          paper: {
            border: "1px solid var(--display-menu-border)",
            borderRadius: "var(--display-menu-radius)",
            boxShadow: "var(--display-menu-shadow)",
            backgroundColor: "var(--display-menu-fill)",
          },
        },
      },

      MuiPopover: {
        styleOverrides: {
          paper: {
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sheet)",
            boxShadow: "var(--shadow-1)",
          },
        },
      },

      MuiMenuItem: {
        styleOverrides: {
          root: {
            ...type("popup-title"),
            fontWeight: "var(--type-weight-regular)",
            minHeight: "var(--display-menu-item-height)",
            padding: "0 var(--display-menu-item-x)",
            color: "var(--display-menu-text)",
            "&:hover": { backgroundColor: "var(--display-menu-hover-fill)" },
            "&:active": { backgroundColor: "var(--display-menu-active-fill)" },
            "&.Mui-selected, &.Mui-selected:hover": { backgroundColor: "var(--selection-bg)", color: "var(--selection-text)" },
            "&.Mui-focusVisible": { backgroundColor: "transparent" },
            "&:focus-visible, &.Mui-focusVisible": { outlineOffset: "calc(-1 * var(--size-focus-ring))" },
          },
        },
      },

      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: "none", backgroundColor: "var(--surface)", color: "var(--text)" },
          rounded: { borderRadius: "var(--radius-sheet)" },
          outlined: { border: "1px solid var(--panel-border)" },
        },
      },

      MuiCard: {
        defaultProps: { elevation: 0, variant: "outlined" },
        styleOverrides: {
          root: {
            borderRadius: "var(--panel-radius)",
            border: "1px solid var(--panel-border)",
            boxShadow: "none",
            backgroundImage: "none",
          },
        },
      },

      MuiAccordion: {
        defaultProps: { elevation: 0, disableGutters: true },
        styleOverrides: {
          root: {
            border: "1px solid var(--panel-border)",
            borderRadius: "var(--panel-radius)",
            "&::before": { display: "none" },
          },
        },
      },

      MuiBackdrop: {
        styleOverrides: {
          root: { variants: [{ props: { invisible: false }, style: { backgroundColor: "var(--backdrop)" } }] },
        },
      },

      MuiDialog: {
        styleOverrides: {
          paper: {
            border: "1px solid var(--dialog-border)",
            borderRadius: "var(--dialog-radius)",
            boxShadow: "var(--dialog-shadow)",
            backgroundColor: "var(--dialog-fill)",
            color: "var(--dialog-text)",
            margin: "var(--space-popup-margin)",
            width: "calc(100% - 2 * var(--space-popup-margin))",
            maxHeight: "var(--dialog-max-height)",
          },
          paperWidthXs: { maxWidth: "var(--dialog-width-sm)" },
          paperWidthSm: { maxWidth: "var(--dialog-width-sm)" },
          paperWidthMd: { maxWidth: "var(--dialog-width-md)" },
          paperWidthLg: { maxWidth: "var(--dialog-width-lg)" },
          paperFullScreen: { margin: 0, width: "100%", maxHeight: "none", borderRadius: 0, border: "none" },
        },
      },

      MuiDialogTitle: {
        styleOverrides: {
          root: { ...type("section-title"), color: "var(--dialog-title)", padding: "var(--dialog-padding) var(--dialog-padding) var(--space-3)" },
        },
      },

      MuiDialogContent: {
        styleOverrides: { root: { padding: "var(--space-2) var(--dialog-padding)" } },
      },

      MuiDialogActions: {
        styleOverrides: {
          root: { padding: "var(--space-4) var(--dialog-padding) var(--dialog-padding)", gap: "var(--space-inline)", "& > :not(style) ~ :not(style)": { marginLeft: 0 } },
        },
      },

      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            ...type("caption"),
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            boxShadow: "var(--toggletip-shadow)",
            borderRadius: "var(--toggletip-radius)",
            padding: "var(--toggletip-padding-y) var(--toggletip-padding-x)",
            maxWidth: "var(--toggletip-max-width)",
          },
          arrow: { color: "var(--surface)", "&::before": { border: "1px solid var(--border)" } },
        },
      },

      MuiAlert: {
        defaultProps: {
          iconMapping: {
            success: createElement(CheckCircleOutlined, { fontSize: "inherit" }),
            warning: createElement(WarningAmberOutlined, { fontSize: "inherit" }),
            error: createElement(HighlightOffOutlined, { fontSize: "inherit" }),
            info: createElement(InfoOutlined, { fontSize: "inherit" }),
          },
        },
        styleOverrides: {
          root: {
            ...type("body"),
            borderRadius: "var(--alert-radius)",
            padding: "var(--alert-padding) var(--alert-padding-x)",
            gap: "var(--alert-gap)",
            border: "none",
            "& .MuiAlert-icon": { marginRight: 0, padding: 0, fontSize: "var(--alert-icon-size)", opacity: 1 },
            "& .MuiAlert-message": { padding: 0 },
            "& .MuiAlert-action": { paddingTop: 0, marginRight: 0 },
            variants: (["success", "warning", "error", "info"] as const).map((kind) => ({
              props: { severity: kind },
              style: {
                backgroundColor: `var(--alert-variant-${kind}-fill)`,
                color: `var(--alert-variant-${kind}-text)`,
                "& .MuiAlert-icon": { color: `var(--alert-variant-${kind}-icon)` },
              },
            })),
          },
        },
      },

      MuiAlertTitle: {
        styleOverrides: { root: { ...type("label"), marginTop: 0, color: "inherit" } },
      },

      MuiSnackbar: {
        styleOverrides: {
          // Toasts sit at the bottom right of the safe area (the preview's .toast). The
          // width lives on this fixed root, whose 100% is the viewport: 420 px on a
          // desktop, 24 px clear of both edges on a phone.
          anchorOriginBottomRight: {
            left: "auto",
            right: "calc(var(--toast-offset-x) + env(safe-area-inset-right, 0px))",
            bottom: "calc(var(--toast-offset-y) + env(safe-area-inset-bottom, 0px))",
            width: "min(100% - 2 * var(--toast-edge-offset), var(--toast-max-width))",
          },
        },
      },

      MuiSnackbarContent: {
        styleOverrides: {
          root: {
            fontFamily: "var(--type-label-family)",
            fontSize: "var(--text-sm)",
            lineHeight: "var(--leading-sm)",
            fontWeight: "var(--type-weight-regular)",
            flexWrap: "nowrap",
            backgroundColor: "var(--toast-fill)",
            color: "var(--toast-text)",
            border: "1px solid var(--toast-border)",
            borderRadius: "var(--toast-radius)",
            boxShadow: "var(--toast-shadow)",
            padding: "var(--toast-padding) var(--toast-padding-x)",
            width: "100%",
            maxWidth: "var(--toast-max-width)",
          },
          // MUI pads the message 8 px top and bottom, which made a one-line toast ~64 px tall.
          message: { padding: 0, minWidth: 0 },
          action: { marginRight: 0, paddingLeft: "var(--space-3)" },
        },
      },

      MuiTableCell: {
        styleOverrides: {
          root: {
            ...type("body"),
            padding: "var(--table-cell-y) var(--table-cell-x)",
            borderBottom: "1px solid var(--table-rule)",
            color: "var(--table-text)",
          },
          head: {
            ...type("label"),
            color: "var(--table-variant-header-text)",
            backgroundColor: "var(--table-variant-header-fill)",
            borderBottom: "1px solid var(--table-variant-header-rule)",
          },
          paddingCheckbox: { width: "var(--table-col-min-check)", padding: "0 var(--table-cell-x)" },
        },
      },

      MuiTableRow: {
        styleOverrides: {
          root: {
            height: "var(--table-row-height)",
            "&.MuiTableRow-hover:hover": { backgroundColor: "var(--table-hover-fill)" },
            "&.Mui-selected, &.Mui-selected:hover": {
              backgroundColor: "var(--table-variant-selected-fill)",
              boxShadow: "inset var(--size-marker) 0 0 var(--table-variant-selected-marker)",
            },
          },
        },
      },

      MuiTablePagination: {
        styleOverrides: {
          root: { color: "var(--text-secondary)", borderTop: "1px solid var(--border)" },
          displayedRows: { ...type("caption"), fontVariantNumeric: "tabular-nums" },
          selectLabel: type("caption"),
        },
      },

      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: "none",
            color: "var(--table-text)",
            "--DataGrid-rowBorderColor": "var(--table-rule)",
            "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader": {
              color: "var(--table-variant-header-text)",
              backgroundColor: "var(--table-variant-header-fill)",
            },
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "var(--weight-semibold)" },
            "& .MuiDataGrid-row:hover": { backgroundColor: "var(--table-hover-fill)" },
            "& .MuiDataGrid-row.Mui-selected": { backgroundColor: "var(--table-variant-selected-fill)" },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
              outline: "var(--border-width-focus) solid var(--focus-ring)",
              outlineOffset: "calc(-1 * var(--size-focus-ring))",
            },
          },
        },
      },

      MuiSkeleton: {
        defaultProps: { animation: "wave" },
        styleOverrides: {
          root: { backgroundColor: "var(--skeleton-base)" },
          wave: {
            "&::after": {
              background: "linear-gradient(90deg, transparent, var(--skeleton-highlight), transparent)",
              animationDuration: "var(--motion-shimmer)",
            },
          },
          text: { borderRadius: 0 },
          rounded: { borderRadius: "var(--radius-control)" },
        },
      },

      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 4, borderRadius: 0, backgroundColor: "var(--in-progress-track)" },
          bar: { borderRadius: 0, backgroundColor: "var(--in-progress-bar)" },
        },
      },

      MuiCircularProgress: {
        styleOverrides: { root: { color: "var(--in-progress-text)" } },
      },

      MuiLink: {
        defaultProps: { underline: "always" },
        styleOverrides: {
          root: {
            color: "var(--link)",
            textDecorationColor: "currentColor",
            textDecorationThickness: "var(--border-width-underline)",
            textUnderlineOffset: "2px",
            "&:hover": { textDecorationThickness: "var(--border-width-underline-hover)" },
          },
        },
      },

      MuiFab: {
        styleOverrides: {
          root: {
            width: "var(--launcher-size)",
            height: "var(--launcher-size)",
            backgroundColor: "var(--launcher-fill)",
            color: "var(--launcher-icon)",
            border: "1px solid var(--launcher-border)",
            boxShadow: "var(--launcher-shadow)",
            ...PRESS,
            "&:hover": { backgroundColor: "var(--launcher-hover-fill)", boxShadow: "var(--launcher-shadow)" },
            "&:active": { backgroundColor: "var(--launcher-active-fill)", boxShadow: "var(--launcher-shadow)" },
            [FOCUS]: { ...frame("var(--focus-ring)"), boxShadow: "inset 0 0 0 1px var(--focus-ring), var(--launcher-shadow)" },
          },
        },
      },

      MuiAppBar: {
        defaultProps: { elevation: 0, color: "inherit" },
        styleOverrides: {
          root: {
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            boxShadow: "none",
            borderBottom: "1px solid var(--border)",
          },
        },
      },

      MuiDivider: {
        styleOverrides: { root: { borderColor: "var(--border-subtle)" } },
      },

      MuiAvatar: {
        styleOverrides: {
          colorDefault: { backgroundColor: "var(--surface-active)", color: "var(--text)" },
        },
      },

      MuiBadge: {
        styleOverrides: {
          badge: { ...type("caption"), fontWeight: "var(--weight-semibold)", fontVariantNumeric: "tabular-nums" },
          colorPrimary: {
            backgroundColor: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          },
        },
      },

      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: "var(--surface)", borderColor: "var(--border)" },
        },
      },

      MuiTypography: {
        styleOverrides: {
          root: {
            variants: [
              // Primary text is the accent text; the Soft sage fill is for filled controls only.
              { props: { color: "primary" }, style: { color: "var(--accent-text)" } },
              { props: { color: "textSecondary" }, style: { color: "var(--text-secondary)" } },
            ],
          },
        },
      },

      MuiSvgIcon: {
        styleOverrides: {
          colorPrimary: { color: "var(--icon-accent)" },
          colorSecondary: { color: "var(--icon-default)" },
          colorAction: { color: "var(--icon-default)" },
          colorDisabled: { color: "var(--disabled-icon)" },
        },
      },
    },
  });
}

const theme = createKiwiTheme();

export default theme;
