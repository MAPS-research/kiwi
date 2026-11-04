import { render, screen } from "@testing-library/react";
import { Button, Checkbox, IconButton, Radio, Switch, ToggleButton } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { createKiwiTheme } from "./Theme.ts";

/** Every CSS rule emotion has inserted so far, as text. */
const insertedCss = () =>
  Array.from(document.querySelectorAll("style"))
    .map((style) => style.textContent ?? "")
    .join("\n");

/**
 * The declarations of every keyboard-focus rule emotion generated for this
 * element's class, in insertion order (a selector list such as
 * `.css-x.Mui-focusVisible,.css-x:focus-visible` counts).
 */
const focusRuleOf = (element: Element, target = "") => {
  const emotionClass = Array.from(element.classList).find((name) => name.startsWith("css-"));
  expect(emotionClass).toBeDefined();
  const rule = new RegExp(`([^{}]*)\\{([^{}]*)\\}`, "g");
  return Array.from(insertedCss().matchAll(rule))
    .filter(([, selector]) => selector.includes(`.${emotionClass}.Mui-focusVisible`) && selector.includes(target))
    .map(([, , body]) => body)
    .join("\n");
};

describe("Kiwi theme focus", () => {
  it("gives every MUI button the one 2 px focus ring, without touching its box-shadow", () => {
    const { focusVisible } = createKiwiTheme({ dark: false });

    expect(focusVisible).toMatchObject({
      outlineStyle: "solid",
      outlineColor: "var(--focus-ring)",
      outlineWidth: "var(--border-width-focus)",
    });
    expect(focusVisible && String(focusVisible.outlineOffset)).toContain("var(--size-focus-offset)");
    // A pressed marker or the launcher's shadow is a box-shadow; the ring must not replace it.
    expect(focusVisible && focusVisible.boxShadow).toBeUndefined();
  });

  it("draws the ring on a borderless control, which MUI's ButtonBase would otherwise reset to outline 0", () => {
    render(
      <ThemeProvider theme={createKiwiTheme({ dark: false })}>
        <IconButton aria-label="Show password">
          <span />
        </IconButton>
      </ThemeProvider>
    );

    const rule = focusRuleOf(screen.getByRole("button", { name: "Show password" }));
    expect(rule).toContain("outline-style:solid");
    expect(rule).toContain("outline-color:var(--focus-ring)");
  });

  it("keeps a bordered button to its own frame, with no ring outside it", () => {
    render(
      <ThemeProvider theme={createKiwiTheme({ dark: false })}>
        <Button variant="contained">Sign in</Button>
        <Button variant="outlined">Cancel</Button>
        <ToggleButton value="week">Week</ToggleButton>
      </ThemeProvider>
    );

    for (const name of ["Sign in", "Cancel", "Week"]) {
      const rule = focusRuleOf(screen.getByRole("button", { name }));
      // The frame comes after the ring in the same class, so its outline wins.
      expect(rule.lastIndexOf("outline:none")).toBeGreaterThan(rule.lastIndexOf("outline-style:solid"));
    }
  });

  it("leaves checkboxes, radios and switches to the frame on their box or track", () => {
    const { container } = render(
      <ThemeProvider theme={createKiwiTheme({ dark: false })}>
        <Checkbox slotProps={{ input: { "aria-label": "Remember me" } }} />
        <Radio slotProps={{ input: { "aria-label": "Lecture" } }} />
        <Switch slotProps={{ input: { "aria-label": "Kiwi animation" } }} />
      </ThemeProvider>
    );

    for (const [root, target] of [
      [".MuiCheckbox-root", "svg:first-of-type"],
      [".MuiRadio-root", "svg:first-of-type"],
      [".MuiSwitch-switchBase", ".MuiSwitch-track"],
    ] as const) {
      const rules = focusRuleOf(container.querySelector(root)!, target);
      // MUI's ring on the glyph or the track is turned off again by a later rule.
      expect(rules.lastIndexOf("outline:none")).toBeGreaterThan(rules.lastIndexOf("outline-style:solid"));
    }
  });
});
