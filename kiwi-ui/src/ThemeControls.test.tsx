import { render, screen } from "@testing-library/react";
import { Checkbox, FormControlLabel, IconButton, Switch } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { createKiwiTheme } from "./Theme.ts";

/** The declarations of every emotion rule whose selector names this element's class and the given part. */
const rulesFor = (element: Element, part: string) => {
  const emotionClass = Array.from(element.classList).find((name) => name.startsWith("css-"));
  expect(emotionClass).toBeDefined();
  const css = Array.from(document.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .join("\n");
  return Array.from(css.matchAll(/([^{}]*)\{([^{}]*)\}/g))
    .filter(([, selector]) => selector.includes(`.${emotionClass}`) && selector.includes(part))
    .map(([, , body]) => body)
    .join("\n");
};

describe("Kiwi theme controls", () => {
  it("marks a pressed icon button with a flat bar inside its corners, not an inset shadow", () => {
    render(
      <ThemeProvider theme={createKiwiTheme({ dark: false })}>
        <IconButton aria-label="Snap to side" aria-pressed="true">
          <span />
        </IconButton>
      </ThemeProvider>
    );

    const pressed = rulesFor(screen.getByRole("button", { name: "Snap to side" }), "[aria-pressed='true']");
    expect(pressed).toContain("box-shadow:none");
    expect(pressed).toContain("background-image:linear-gradient(var(--icon-button-variant-selected-marker), var(--icon-button-variant-selected-marker))");
    expect(pressed).toContain("background-size:calc(100% - 2 * var(--icon-button-radius)) var(--icon-button-marker)");
  });

  it("sets control labels in the label role: 400 beside a checkbox, 600 beside a switch", () => {
    const { container } = render(
      <ThemeProvider theme={createKiwiTheme({ dark: false })}>
        <FormControlLabel control={<Checkbox />} label="Remember me" />
        <FormControlLabel control={<Switch />} label="Add class-specific instructions" />
      </ThemeProvider>
    );

    const root = container.querySelector(".MuiFormControlLabel-root")!;
    const label = rulesFor(root, ".MuiFormControlLabel-label");
    expect(label).toContain("font-size:var(--type-label-size)");
    expect(label).toContain("font-weight:var(--type-weight-regular)");
    expect(rulesFor(root, ":has(.MuiSwitch-root) .MuiFormControlLabel-label")).toContain("font-weight:var(--type-label-weight)");
  });

  it("shows the not-allowed pointer on an aria-disabled button, over ButtonBase's own hand", () => {
    render(
      <ThemeProvider theme={createKiwiTheme({ dark: false })}>
        <IconButton aria-label="Share answer" aria-disabled="true">
          <span />
        </IconButton>
      </ThemeProvider>
    );

    expect(rulesFor(screen.getByRole("button", { name: "Share answer" }), "[aria-disabled='true']")).toContain(
      "cursor:not-allowed"
    );
  });

  it("draws a small switch with the one 14 px thumb and 3 px inset", () => {
    const { container } = render(
      <ThemeProvider theme={createKiwiTheme({ dark: false })}>
        <Switch size="small" slotProps={{ input: { "aria-label": "Experiment" } }} />
      </ThemeProvider>
    );

    const root = container.querySelector(".MuiSwitch-root")!;
    expect(rulesFor(root, ".MuiSwitch-sizeSmall .MuiSwitch-thumb")).toContain("width:var(--switch-thumb-size)");
    expect(rulesFor(root, ".MuiSwitch-sizeSmall .MuiSwitch-switchBase")).toContain(
      "padding:calc((var(--switch-track-height) - var(--switch-thumb-size)) / 2)"
    );
  });
});
